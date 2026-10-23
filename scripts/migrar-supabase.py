"""
Migra Griyo de un proyecto de Supabase a otro: cuentas (con sus contraseñas),
tablas y fotos. Se puede correr varias veces sin duplicar nada.

Qué necesita (todo en la carpeta data/migracion/, que Git ignora):
  - nuevo.env       → NUEVO_URL=https://xxxx.supabase.co  y  NUEVO_SERVICE_ROLE_KEY=...
  - auth_users.csv  → resultado de esta consulta en el SQL editor del proyecto VIEJO
                      (botón "Download CSV"):
        select id, email, encrypted_password, email_confirmed_at, created_at,
               raw_user_meta_data, raw_app_meta_data
        from auth.users order by created_at;
El proyecto viejo se lee de .env.local (NEXT_PUBLIC_SUPABASE_URL y
SUPABASE_SERVICE_ROLE_KEY). Antes de correrlo, en el proyecto NUEVO hay que
haber corrido supabase/schema.sql completo en el SQL editor.

Uso:  python scripts/migrar-supabase.py            (migra)
      python scripts/migrar-supabase.py --verificar (solo compara cantidades)
"""
import csv
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MIG = os.path.join(RAIZ, "data", "migracion")


def leer_env(ruta):
    env = {}
    for l in open(ruta, encoding="utf-8"):
        l = l.strip()
        if l and not l.startswith("#") and "=" in l:
            k, v = l.split("=", 1)
            env[k] = v.strip().strip('"')
    return env


viejo = leer_env(os.path.join(RAIZ, ".env.local"))
nuevo = leer_env(os.path.join(MIG, "nuevo.env"))
V_URL, V_KEY = viejo["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/"), viejo["SUPABASE_SERVICE_ROLE_KEY"]
N_URL, N_KEY = nuevo["NUEVO_URL"].rstrip("/"), nuevo["NUEVO_SERVICE_ROLE_KEY"]
assert V_URL != N_URL, "El proyecto nuevo es el mismo que el viejo: revisa nuevo.env"

# Orden que respeta las claves foráneas.
TABLAS = [
    "abuelos", "usuarios", "recordatorios", "memorias", "conversaciones", "alertas_emergencia",
    "alertas_animo", "registros_animo", "abuelo_dispositivos", "push_subscriptions", "fotos",
    "preguntas_familia", "suscripciones", "preferencias_charla", "consentimientos",
]
CLAVE_CONFLICTO = {"preferencias_charla": "abuelo_id", "suscripciones": "abuelo_id", "consentimientos": "auth_user_id,version"}


def pedir(base, key, metodo, ruta, cuerpo=None, extra=None, crudo=False):
    h = {"apikey": key, "Authorization": "Bearer " + key}
    data = None
    if cuerpo is not None:
        data = cuerpo if isinstance(cuerpo, bytes) else json.dumps(cuerpo).encode()
        h["Content-Type"] = "application/json" if not isinstance(cuerpo, bytes) else (extra or {}).get("Content-Type", "application/octet-stream")
    if extra:
        h.update(extra)
    r = urllib.request.Request(base + ruta, data=data, method=metodo, headers=h)
    try:
        with urllib.request.urlopen(r, timeout=180) as resp:
            t = resp.read()
            return resp.status, (t if crudo else (json.loads(t) if t else {}))
    except urllib.error.HTTPError as e:
        t = e.read()
        try:
            return e.code, json.loads(t)
        except Exception:
            return e.code, {"raw": t[:300].decode("utf-8", "ignore")}


def leer_tabla(base, key, tabla):
    filas, desde = [], 0
    while True:
        orden = "&order=id.asc" if tabla not in CLAVE_CONFLICTO else ""
        st, lote = pedir(base, key, "GET", f"/rest/v1/{tabla}?select=*{orden}&limit=1000&offset={desde}")
        if st == 404 or (isinstance(lote, dict) and lote.get("code") in ("42P01", "PGRST205")):
            return None
        if st != 200:
            raise RuntimeError(f"{tabla}: {st} {lote}")
        filas += lote
        if len(lote) < 1000:
            return filas
        desde += 1000


def contar(base, key, tabla):
    f = leer_tabla(base, key, tabla)
    return None if f is None else len(f)


if "--verificar" in sys.argv:
    print(f"{'tabla':24}{'viejo':>8}{'nuevo':>8}")
    ok = True
    for t in TABLAS:
        a, b = contar(V_URL, V_KEY, t), contar(N_URL, N_KEY, t)
        marca = "" if (a or 0) == (b or 0) else "  <-- DIFERENTE"
        ok = ok and not marca
        print(f"{t:24}{str(a):>8}{str(b):>8}{marca}")
    print("TODO IGUAL" if ok else "HAY DIFERENCIAS")
    sys.exit(0 if ok else 1)

# ---------------------------------------------------------------- 1) cuentas
ruta_csv = os.path.join(MIG, "auth_users.csv")
if not os.path.exists(ruta_csv):
    sys.exit("Falta data/migracion/auth_users.csv (ver las instrucciones al inicio de este archivo).")


def json_o_vacio(txt):
    try:
        return json.loads(txt) if txt else {}
    except Exception:
        return {}


creadas = existentes = 0
for fila in csv.DictReader(open(ruta_csv, encoding="utf-8-sig", newline="")):
    cuerpo = {
        "id": fila["id"],
        "email": fila["email"],
        "password_hash": fila["encrypted_password"] or None,
        "email_confirm": bool(fila["email_confirmed_at"]),
        "user_metadata": json_o_vacio(fila.get("raw_user_meta_data")),
        "app_metadata": json_o_vacio(fila.get("raw_app_meta_data")),
    }
    if not cuerpo["password_hash"]:
        del cuerpo["password_hash"]
    st, r = pedir(N_URL, N_KEY, "POST", "/auth/v1/admin/users", cuerpo)
    if st in (200, 201):
        creadas += 1
    elif st == 422 or "already" in json.dumps(r).lower() or "exists" in json.dumps(r).lower():
        existentes += 1
    else:
        sys.exit(f"No se pudo crear la cuenta {fila['email']}: {st} {r}")
print(f"Cuentas: {creadas} creadas, {existentes} ya existían")

# ---------------------------------------------------------------- 2) tablas
for t in TABLAS:
    filas = leer_tabla(V_URL, V_KEY, t)
    if filas is None:
        print(f"{t}: no existe en el proyecto viejo, se omite")
        continue
    conflicto = CLAVE_CONFLICTO.get(t, "id")
    for i in range(0, len(filas), 200):
        lote = filas[i:i + 200]
        st, r = pedir(N_URL, N_KEY, "POST", f"/rest/v1/{t}?on_conflict={conflicto}", lote,
                      extra={"Prefer": "resolution=merge-duplicates,return=minimal"})
        if st not in (200, 201, 204):
            sys.exit(f"{t}: error {st} {r} (¿corriste schema.sql completo en el proyecto nuevo?)")
    print(f"{t}: {len(filas)} filas")

# ---------------------------------------------------------------- 3) fotos
st, fotos = pedir(V_URL, V_KEY, "GET", "/rest/v1/fotos?select=storage_path")
copiadas = 0
if st == 200:
    pedir(N_URL, N_KEY, "POST", "/storage/v1/bucket", {"id": "fotos-legado", "name": "fotos-legado", "public": False})
    for f in fotos:
        ruta = f["storage_path"]
        s1, datos = pedir(V_URL, V_KEY, "GET", "/storage/v1/object/fotos-legado/" + urllib.parse.quote(ruta), crudo=True)
        if s1 != 200:
            print("  no se pudo leer", ruta)
            continue
        tipo = "image/png" if ruta.lower().endswith("png") else "image/jpeg"
        s2, r2 = pedir(N_URL, N_KEY, "POST", "/storage/v1/object/fotos-legado/" + urllib.parse.quote(ruta), datos,
                       extra={"Content-Type": tipo, "x-upsert": "true"})
        copiadas += 1 if s2 in (200, 201) else 0
print(f"Fotos copiadas: {copiadas} de {len(fotos) if st == 200 else 0}")
print("\nListo. Corre de nuevo con --verificar para comparar las cantidades.")
