"use client";

import { useEffect, useRef, useState } from "react";
import { fetchAbuelo, fetchFamiliar } from "@/lib/auth/fetchConAuth";
import { CameraIcon, TrashIcon } from "@/components/icons";

interface FotoItem {
  id: string;
  descripcion: string | null;
  subida_por_rol: "abuelo" | "familiar";
  subida_por_nombre: string | null;
  created_at: string;
  url: string | null;
}

// Antes de subir, la foto se reduce a un JPG de máx. 1600 px: una foto de
// celular pesa varios MB (no entra en el límite de la función del servidor) y
// el libro no necesita más resolución que esa. Convertir siempre a JPG
// también resuelve formatos como HEIC de iPhone, que el PDF no soporta.
async function reducirAJpeg(file: File, maxLado = 1600, calidad = 0.82): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, fallo) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => fallo(new Error("No pudimos abrir esa foto. Prueba con otra."));
      i.src = url;
    });
    const escala = Math.min(1, maxLado / Math.max(img.naturalWidth, img.naturalHeight));
    const ancho = Math.max(1, Math.round(img.naturalWidth * escala));
    const alto = Math.max(1, Math.round(img.naturalHeight * escala));
    const canvas = document.createElement("canvas");
    canvas.width = ancho;
    canvas.height = alto;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No pudimos preparar la foto.");
    ctx.fillStyle = "#ffffff"; // un PNG con transparencia no debe quedar negro en JPG
    ctx.fillRect(0, 0, ancho, alto);
    ctx.drawImage(img, 0, 0, ancho, alto);
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", calidad));
    if (!blob) throw new Error("No pudimos preparar la foto.");
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function FotosLegado({
  modo,
  nombrePersona,
}: {
  modo: "abuelo" | "familiar";
  nombrePersona?: string;
}) {
  const fetcher = modo === "abuelo" ? fetchAbuelo : fetchFamiliar;
  const inputRef = useRef<HTMLInputElement>(null);

  const [fotos, setFotos] = useState<FotoItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [pendiente, setPendiente] = useState<{ blob: Blob; previewUrl: string } | null>(null);
  const [descripcion, setDescripcion] = useState("");
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    fetcher("/api/fotos")
      .then(async (res) => (res.ok ? res.json() : { fotos: [] }))
      .then((data) => {
        if (vivo) setFotos(data.fotos ?? []);
      })
      .catch(() => {})
      .finally(() => {
        if (vivo) setCargando(false);
      });
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function alElegir(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = ""; // permite volver a elegir la misma foto
    if (!archivo) return;
    setError(null);
    try {
      const blob = await reducirAJpeg(archivo);
      setPendiente({ blob, previewUrl: URL.createObjectURL(blob) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos abrir esa foto.");
    }
  }

  function cancelar() {
    if (pendiente) URL.revokeObjectURL(pendiente.previewUrl);
    setPendiente(null);
    setDescripcion("");
  }

  async function guardar() {
    if (!pendiente || subiendo) return;
    setSubiendo(true);
    setError(null);
    try {
      const datos = new FormData();
      datos.append("foto", pendiente.blob, "foto.jpg");
      if (descripcion.trim()) datos.append("descripcion", descripcion.trim());
      const res = await fetcher("/api/fotos", { method: "POST", body: datos });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "No pudimos guardar la foto. Prueba de nuevo.");
      setFotos((prev) => [data.foto, ...prev]);
      cancelar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos guardar la foto.");
    } finally {
      setSubiendo(false);
    }
  }

  async function quitar(foto: FotoItem) {
    if (!window.confirm("¿Quitar esta foto del libro?")) return;
    setError(null);
    const res = await fetcher(`/api/fotos/${foto.id}`, { method: "DELETE" });
    if (res.ok) {
      setFotos((prev) => prev.filter((f) => f.id !== foto.id));
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "No pudimos quitar la foto.");
    }
  }

  const titulo = modo === "abuelo" ? "Tus fotos" : `Fotos de ${nombrePersona ?? "tu familiar"}`;
  const explicacion =
    modo === "abuelo"
      ? "Las fotos que agregues aparecen en tu libro de recuerdos, junto a tus historias."
      : "Las fotos que sumen la familia y la propia persona aparecen en el libro de Legado Vivo.";

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-3xl shadow-warm-sm p-5">
      <div className="flex items-center gap-3 mb-1">
        <span className="w-10 h-10 shrink-0 rounded-2xl bg-ember-100 text-ember-700 flex items-center justify-center">
          <CameraIcon className="w-5 h-5" />
        </span>
        <h2 className="font-heading text-lg font-semibold text-sand-900">{titulo}</h2>
      </div>
      <p className="text-base text-sand-700 mb-4">{explicacion}</p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={alElegir}
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
      />

      {pendiente ? (
        <div className="bg-sand-100 rounded-2xl p-4 mb-4 animate-pop-in">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={pendiente.previewUrl}
            alt="Vista previa de la foto que vas a agregar"
            className="w-full max-h-72 object-contain rounded-xl bg-white mb-3"
          />
          <input
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            maxLength={200}
            placeholder="¿Quién sale o qué recuerdo es? (opcional)"
            className="w-full min-h-[52px] rounded-2xl border-2 border-sand-400 bg-white px-4 text-lg text-sand-900 placeholder:text-sand-600 focus:outline-none focus:ring-4 focus:ring-ember-200 focus:border-ember-400 mb-3"
          />
          <div className="flex gap-2">
            <button
              onClick={guardar}
              disabled={subiendo}
              className="flex-1 min-h-[52px] bg-ember-600 hover:bg-ember-700 text-white rounded-2xl font-semibold disabled:opacity-60 transition-colors"
            >
              {subiendo ? "Guardando..." : "Guardar foto"}
            </button>
            <button
              onClick={cancelar}
              disabled={subiendo}
              className="min-h-[52px] px-5 rounded-2xl text-sand-800 hover:bg-sand-200 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full min-h-[56px] bg-dusk-700 hover:bg-dusk-800 text-white rounded-2xl font-semibold flex items-center justify-center gap-2 mb-4 transition-colors"
        >
          <CameraIcon className="w-5 h-5" />
          Agregar una foto
        </button>
      )}

      {error && <p className="text-clay-600 text-base mb-3">{error}</p>}

      {cargando ? (
        <p className="text-sand-700">Cargando fotos...</p>
      ) : fotos.length === 0 ? (
        <p className="text-sand-700 text-base">Todavía no hay fotos agregadas.</p>
      ) : (
        <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {fotos.map((f) => {
            const puedeQuitar = modo === "familiar" || f.subida_por_rol === "abuelo";
            return (
              <li key={f.id} className="relative bg-sand-100 rounded-2xl overflow-hidden">
                {f.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={f.url}
                    alt={f.descripcion ?? "Foto del libro de recuerdos"}
                    loading="lazy"
                    className="w-full h-32 object-cover"
                  />
                ) : (
                  <div className="w-full h-32 flex items-center justify-center text-sand-600 text-sm">
                    No se pudo cargar
                  </div>
                )}
                <div className="p-2">
                  {f.descripcion && (
                    <p className="text-sm text-sand-900 leading-snug line-clamp-2">{f.descripcion}</p>
                  )}
                  {f.subida_por_nombre && (
                    <p className="text-xs text-sand-600 mt-0.5">Agregó {f.subida_por_nombre}</p>
                  )}
                </div>
                {puedeQuitar && (
                  <button
                    onClick={() => quitar(f)}
                    aria-label="Quitar esta foto"
                    className="absolute top-1.5 right-1.5 w-9 h-9 rounded-full bg-white/90 text-clay-600 hover:bg-white flex items-center justify-center shadow-warm-sm"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
