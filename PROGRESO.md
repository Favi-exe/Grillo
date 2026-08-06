# PROGRESO — Grillo MVP

Registro de la sesión de construcción autónoma. Todos los timestamps son
aproximados (hora local de la máquina, 2026-08-06).

## Sesión 5 — Conexión a APIs reales

El usuario pasó keys reales por chat para Anthropic, Pinecone, ElevenLabs y
OpenWeatherMap, más credenciales de Supabase (sin URL de proyecto). Se
guardaron en `.env.local` (gitignored, nunca se sube) y se verificó cada
una con una llamada mínima real antes de darla por conectada — no alcanza
con "pegar la key", si algo fallaba había que enterarse ahora, no en la demo.

**Resultado por servicio:**

- ✅ **Anthropic**: probado con una llamada real. El modelo
  `claude-sonnet-4-6` (tal como pedía el prompt maestro original) responde
  correctamente — quedó confirmado que es un id de modelo válido, no hacía
  falta cambiarlo. El chat de `/abuelo` ya corre 100% en modo real
  (`fuente: "real"`), con tool use funcionando (probado en vivo: contó una
  anécdota de la infancia y Grillo llamó a `guardar_memoria` sola, sin
  anunciarlo, tal como pide el system prompt).
- ✅ **Pinecone**: ya existía un índice `grillo-memorias` en la cuenta
  (serverless, AWS us-east-1, métrica coseno, **dimensión 1024**). Probado
  con upsert + query + delete reales antes de conectarlo a la app. Como no
  hay `OPENAI_API_KEY` (no la pasó el usuario), los embeddings siguen
  siendo el pseudo-embedding mock — se ajustó su dimensión de 64 a **1024**
  en `src/lib/ai/embeddings.ts` para que calce exacto con el índice real.
  Resultado: Pinecone real ya guarda y busca memorias de punta a punta, solo
  que la "similitud semántica" today es aproximada (hash de palabras), no
  embeddings verdaderos — mejora automáticamente el día que se sume
  `OPENAI_API_KEY` (ver nota de dimensión en `.env.example`).
- ⚠️ **ElevenLabs**: la key es válida (confirmado con `GET /v1/user/subscription`:
  plan free, 0/10000 caracteres usados, o sea que no es un tema de crédito).
  El problema es la voz elegida (`l1zE9xgNpUTaQCZzpNJa`, "Alberto
  Rodríguez"): es una voz de la **Voice Library** (categoría `professional`),
  y ElevenLabs bloquea el uso de voces de biblioteca vía API en cuentas
  free (`402 paid_plan_required` — confirmado pegándole directo al endpoint
  de TTS). La app se comporta como está diseñada: cae sola al fallback
  (`SpeechSynthesis` del navegador) sin romper nada. Para tener audio real
  hay dos caminos — subir de plan en ElevenLabs, o cambiar
  `ELEVENLABS_VOICE_ID` por una voz "premade" de la cuenta (esas sí andan
  gratis vía API; se dejó la lista completa en el detalle de esta sesión
  más abajo). No se cambió la voz sin consultar porque es una decisión de
  gusto/producto, no un bug.
- ✅ **OpenWeatherMap**: probado con una consulta real a Buenos Aires,
  responde bien.
- ⏸️ **Supabase**: pendiente — el usuario pasó las keys nuevas
  (`sb_publishable_...` / `sb_secret_...`) pero no la URL del proyecto, y
  esas keys solo dan acceso a la API de datos (PostgREST), no permiten
  ejecutar el `CREATE TABLE` de `supabase/schema.sql` por sí solas. Falta:
  la URL del proyecto (siempre necesaria) y, para poder crear las tablas
  sin pedirle al usuario que lo haga a mano, la contraseña de la base
  (Project Settings → Database) o un Personal Access Token de Supabase
  (`sbp_...`, desde supabase.com/dashboard/account/tokens). Mientras tanto
  la app sigue usando el store local en `/data/db.json` (mismo modelo de
  datos), así que nada quedó roto — es la única pieza que falta para estar
  100% en modo real.

**Voces "premade" disponibles en la cuenta de ElevenLabs** (funcionan vía
API sin plan pago; ninguna es explícitamente en español pero
`eleven_multilingual_v2` las hace hablar cualquier idioma):
Roger, Sarah, Laura, Charlie, George, Callum, River, Harry, Liam, Alice,
Matilda, Will, Jessica, Eric, Bella, Chris, Brian, Daniel, Lily, Adam, Bill.

**Limpieza post-verificación**: se borró el vector de prueba real que quedó
en el namespace `abuelo-demo-1` de Pinecone (la memoria de prueba sobre "el
pueblo natal" que se generó al probar el chat real) y se reseteó
`/data/db.json` al seed original, para no ensuciar la demo con datos de
testing.

## Sesión 4 — Español neutro (se saca el voseo rioplatense)

El usuario notó que la app sonaba marcadamente argentina ("vos", "tocá",
"tomá", "contame") en vez de un español neutro, pese a que el prompt
maestro original pedía "rioplatense/chileno neutro" — se prioriza el
feedback explícito del usuario sobre el spec original.

**Alcance**: se barrió todo el texto en español que ve o escucha el usuario
— el system prompt de Grillo (`lib/tools/definitions.ts`, el más importante:
define cómo habla el LLM en modo real), las respuestas y heurísticas del
modo mock (`lib/ai/claude.ts`, `lib/ai/ragAsk.ts`), y las 12 pantallas/
componentes de la UI (landing, login, `/abuelo`, `/familia`, VoiceChat,
Recordatorios\*, Memorias\*, PreguntaMemoria, BotonEmergencia,
AlertasFamiliar), más los datos semilla (`lib/db/localStore.ts`) y el
`README.md`.

**Conversión aplicada** (voseo → tuteo neutro): "vos"→"tú/ti", "sos"→"eres",
"tenés"→"tienes", "podés"→"puedes", "querés"→"quieres", "contame"→
"cuéntame", "contás"→"cuentas", "escribí"→"escribe", "tocá"→"toca",
"tomá"→"toma", "acordate/acordame"→"acuérdate/recuérdame", "sabés"→"sabes",
"acá"→"aquí", y se sacó "che" y la referencia a "tomar unos mates" (cultural
específico de Argentina/Uruguay) de las respuestas mock de clima.

También se cambió el locale usado por la Web Speech API y por
`toLocaleDateString`/`toLocaleTimeString` de `es-AR` a **`es-419`**
(español latinoamericano neutro, el tag BCP47 estándar para esto), tanto
en los hooks de voz como en el formateo de fechas/horas.

**Detalle no obvio**: las heurísticas del modo mock que detectan pedidos de
recordatorio (`chatMock` en `claude.ts`) buscaban literalmente las palabras
en voseo ("acordate", "acordame") en lo que escribe/dice el usuario. Al
neutralizar el texto de la app había que neutralizar también esas regex de
detección (ahora reconocen "recuérdame"/"acuérdate"), si no el mismo cambio
habría roto la detección de "Grillo, recuérdame tomar la pastilla...".

**Verificación**: `tsc`, `next build` y `eslint` limpios. Probado en
navegador de punta a punta con el nuevo texto — pedido de recordatorio,
pregunta de clima, anécdota capturada como memoria, y pregunta RAG desde la
vista familiar — todas las respuestas mock salieron en tuteo neutro y la
lógica de detección de tools siguió funcionando igual que antes. Datos de
prueba reseteados al terminar.

## Sesión 3 — Corrección de producto: el botón de emergencia es de Carlos

A pedido del usuario, revisión de las pantallas de Carlos (abuelo) y Ana
(familiar) con capturas en el navegador. Hallazgo: el botón de emergencia
vivía en la pantalla de Ana con un botón "Probar (mock)" que ella misma
presionaba — lógicamente invertido, ya que quien pide ayuda es Carlos, y la
familia solo debería recibir el aviso.

**Cambios:**
- Nuevo tipo `AlertaEmergencia` + tabla `alertas_emergencia` (local y
  Supabase) + rutas `/api/emergencia` (GET/POST) y `/api/emergencia/[id]`
  (PATCH para resolver).
- `BotonEmergencia.tsx` (nuevo, en `/abuelo`): botón grande "Necesito
  ayuda". Un toque abre una ventana de 3s cancelable ("Avisando a tu
  familia en 3...") antes de disparar la alerta — protege contra toques
  accidentales sin agregar fricción real en una emergencia genuina.
- `AlertasFamiliar.tsx` (nuevo, en `/familia`, reemplaza el botón mockeado):
  muestra el estado real — "Todo tranquilo" o "Carlos pidió ayuda" con hora
  y botón "Ya hablé con él" para resolver. Hace polling cada 8s.
- El flujo quedó conectado de punta a punta en modo mock: Carlos dispara →
  se guarda en la DB → Ana lo ve (sin recargar) → Ana lo resuelve.

**Bug encontrado y corregido durante la verificación**: el primer toque del
botón mandaba DOS alertas duplicadas a la API. Causa: el efecto secundario
(`fetch` POST) estaba adentro del *updater* de `setSegundosRestantes`, que
React StrictMode invoca dos veces a propósito en desarrollo para detectar
efectos impuros — y lo detectó. Se corrigió moviendo el envío a un
`useEffect` separado que reacciona cuando el conteo llega a 0, más una
guarda de idempotencia (`useRef`) que ignora cualquier segundo intento.
Verificado después del fix: un solo registro por toque.

**Mejoras chicas agregadas de paso** (mismo pase, bajo riesgo):
- `/abuelo` muestra la fecha del día ("Jueves, 6 de agosto") para dar
  orientación temporal.
- `/familia` muestra "Carlos habló con Grillo por última vez hace X" (o
  "todavía no charló"), reutilizando el log de `conversaciones` que ya se
  guardaba pero no se mostraba en ningún lado — nueva ruta
  `GET /api/conversaciones`.

**Verificación**: `tsc`, `next build` y `eslint` limpios. Flujo probado
end-to-end en el navegador (Carlos dispara → Ana ve la alerta → Ana la
resuelve → vuelve a "Todo tranquilo"), confirmado también a nivel de red
(un solo `POST /api/emergencia` por toque) y de datos (`data/db.json` con
un único registro). Datos de prueba reseteados al terminar.

## Sesión 2 — Rediseño UI/UX y performance (09:15 en adelante)

Pase puramente visual/interacción/performance sobre el MVP ya funcional de
la Sesión 1. Sin cambios de lógica de negocio ni funciones nuevas.

### Sistema de diseño — "Grillo al atardecer"

El concepto: el grillo canta al atardecer, el momento del patio y la
sobremesa en casa de los abuelos — luz cálida de lámpara contra un cielo de
atardecer. Se evitaron deliberadamente los 3 looks genéricos de IA (cream +
serif + terracota / fondo casi negro + neón / estilo "diario"): tipografía
redondeada en vez de serif, acentos marigold/ciruela en vez de terracota o
neón, bordes generosos y sombras cálidas en vez de líneas finas sin radio.

**Paleta** (`tailwind.config.ts`, escalas completas 50-900):
| Rol | Hex base | Uso |
|---|---|---|
| `sand` | `#FBF1E6` fondo / `#3A2A2E` texto | fondo, superficies, texto (escala neutra cálida) |
| `ember` | `#E2883A` / sólido `#C96B22` | acento primario — CTAs, botón de mic |
| `dusk` | `#7C6A9C` / sólido `#5E4E7B` | acento secundario — identidad "familia", cielo de atardecer |
| `gold` | `#E8B23D` | momento especial (recordatorio activo) |
| `clay` | `#C1483F` | alertas/emergencia (rojo cálido, no rojo de sistema) |
| gradiente `dusk` | `#F6B67A → #4A3B5C` | solo detrás de la pantalla de conversación por voz |

Texto nunca por debajo de 18px (`text-base` global = 1.125rem), contraste
siempre oscuro-sobre-claro o blanco-sobre-sólido-oscuro (nunca gris claro
sobre blanco), verificado a ojo contra AA en cada combinación usada.

**Tipografía**: `Fredoka` (títulos y CTAs, con carácter, uso moderado) +
`Nunito Sans` (cuerpo, muy legible a tamaños grandes). Autoalojadas vía
`next/font/google` — sin request a Google Fonts en runtime.

**Iconografía**: set propio hecho a mano en `src/components/icons.tsx` (24
íconos + la marca), todos SVG inline, mismo trazo (1.8, redondeado, sin
relleno) — reemplaza los emoji de tipo de recordatorio (💊💧🩺🎉📌) que
tenía la v1, que no eran consistentes entre sistemas operativos.

**Elemento firma — "el chirrido"**: en vez de un pulso genérico, la
animación del botón de micrófono late en el ritmo real de un grillo (dos
pulsos cortos + pausa, `chirp-active` en `tailwind.config.ts`) mientras
Grillo escucha. Un grillo lineal hecho a mano (`CricketMark`) es la marca —
aparece en el header, la landing, y como favicon (`src/app/icon.svg`). El
gradiente de atardecer envuelve *solo* la pantalla de conversación por voz,
marcándola como el momento especial de la app.

### Accesibilidad aplicada

- Texto base 18px+, contenido leído por el abuelo en 20-22px (`text-lg`/`xl`).
- Objetivos táctiles ≥48×48px en todos los botones interactivos, con
  espaciado generoso.
- Cero interacciones dependientes de hover; todo funciona por tap/click.
- `@media (prefers-reduced-motion: reduce)` global en `globals.css` que
  colapsa duración de toda animación/transición a ~0 — no depende de que
  cada componente lo maneje por separado.
- Jerarquía clara: una sola acción primaria evidente por pantalla (el botón
  de micrófono en `/abuelo`, "Ingresar" en la landing).

### Optimizaciones de performance

- **Fuentes autoalojadas** vía `next/font` (sin latencia de CDN externo,
  subset automático).
- **Cero librerías de animación**: todo el movimiento (chirrido, pop-in de
  burbujas/tarjetas, fade-rise de entrada, waveform, dots de "pensando") es
  CSS puro (`transform`/`opacity`, compositor-friendly) definido como
  `keyframes` en `tailwind.config.ts` — no se sumó Framer Motion ni
  similares.
- **Íconos SVG inline** en vez de una librería de íconos o imágenes
  rasterizadas — cero requests de red adicionales, tree-shakeable.
- **`React.memo`** en los ítems de lista que más se repiten y no cambian
  seguido: `MessageBubble` (chat), `MemoriaCard`, `RecordatorioItem` /
  `RecordatorioFilaFamiliar`, y el ícono `TipoRecordatorioIcon` compartido.
- **Paginación simple en memorias** (`MemoriasList`): muestra 6 y agrega de
  a 6 con "Ver más historias" en vez de renderizar todo el historial de
  una — sin sumar una librería de virtualización que no hacía falta para
  este volumen.
- **Code-splitting**: `RecordatoriosFamiliar` en `/familia` se carga con
  `next/dynamic` (queda fuera del bundle inicial, con esqueleto de carga)
  porque es el componente más pesado (formulario + lista) y normalmente
  está debajo del pliegue.
- Verificado con `next build`: bundles por ruta se mantuvieron livianos
  (~88-96 kB First Load JS por página, prácticamente sin cambio respecto a
  la v1 pre-rediseño pese a todo el trabajo visual agregado).

### Verificación

- `npx tsc --noEmit`, `npm run build` y `npm run lint` limpios después del
  rediseño completo.
- Probado en navegador: landing → login → `/abuelo` (chat funcionando con
  las nuevas burbujas/animaciones/estados del micrófono, confirmado con una
  pregunta de clima real vía `/api/chat` → `/api/tts`) y `/familia`
  (memorias, pregunta RAG, recordatorios) — sin errores de consola, sin
  romper ningún flujo de la v1.
- Se resetearon los datos de prueba generados durante la verificación para
  dejar el seed original limpio.

## Línea de tiempo (Sesión 1 — construcción del MVP)

- **02:40** — Carpeta del proyecto vacía. Arranca el scaffold: `package.json`,
  `tsconfig`, `next.config`, `tailwind.config`, `.gitignore`.
- **02:50** — Modelo de datos (`src/lib/types.ts`) y capa de DB de doble modo:
  `localStore.ts` (JSON en `/data/db.json`, con seed de Carlos + Ana + 1
  recordatorio + 1 memoria) y `supabaseStore.ts` (Postgres real), unificadas
  detrás de `src/lib/db/index.ts`. `supabase/schema.sql` listo para cuando
  exista el proyecto de Supabase.
- **03:00** — Capa de servicios de IA con switch mock/real: `weather.ts`,
  `embeddings.ts` (pseudo-embedding determinístico por hashing cuando no hay
  `OPENAI_API_KEY`), `pinecone.ts` (vector store local en
  `/data/vectorstore.json` + similitud coseno, con backfill automático de
  memorias que no tenían vector indexado).
- **03:10** — System prompt de Grillo (`src/lib/tools/definitions.ts`) con
  los guardrails pedidos: tono cálido rioplatense, alcance acotado
  (rechaza amablemente temas fuera de lugar), rechazo sin detalle a
  contenido peligroso, sin consejo médico/legal/financiero específico, y
  excepción explícita para angustia real / emergencia (activa el flujo de
  aviso a familia, mockeado). 5 tools definidas: `crear_recordatorio`,
  `consultar_recordatorios`, `guardar_memoria`, `buscar_memorias`,
  `consultar_clima`.
- **03:20** — `src/lib/ai/claude.ts`: loop de tool-use real con el SDK de
  Anthropic + modo mock con heurísticas (detecta pedidos de recordatorio,
  preguntas de clima, y anécdotas por palabras clave + longitud) que dispara
  las mismas tools, así el flujo funciona igual de punta a punta sin API key.
- **03:30** — Flujo 1 (conversación por voz): hooks `useSpeechRecognition` /
  `useSpeechSynthesis` sobre la Web Speech API nativa (sin key), componente
  `VoiceChat.tsx`, ruta `/api/chat`. Rutas `/api/stt` y `/api/tts` con
  Whisper/ElevenLabs reales y mock, listas para cuando se conecten (la UI
  usa el navegador por defecto, así que conectarlas no bloquea la demo).
- **03:45** — Flujo 2 (recordatorios): `/api/recordatorios` (CRUD),
  `RecordatoriosPanel.tsx` (vista del abuelo, con chequeo cada 20s de
  recordatorios que coinciden con la hora actual) y
  `RecordatoriosFamiliar.tsx` (alta/baja/pausa desde la vista familiar).
- **03:55** — Flujo 3 (Legado Vivo): tool `guardar_memoria` indexa en el
  vector store mock al vuelo; ejecutado de forma discreta desde el loop de
  chat, sin interrumpir la charla.
- **04:05** — Flujo 4 (vista familiar): `/familia`, `MemoriasList.tsx`
  (filtro por tema), `PreguntaMemoria.tsx` (RAG: busca memorias similares y
  le pide a Claude —o al mock— que arme una respuesta narrada), botón de
  emergencia mockeado.
- **04:15** — Login simple (`/login`) por selección de rol (sin contraseña),
  landing (`/`), sesión en `localStorage` (`src/lib/session.ts`).
- **04:25** — `.env.example` completo y documentado.
- **04:30** — `npm install`. Se detectó que `next@14.2.15` tenía una
  vulnerabilidad **crítica** conocida (DoS en Server Actions, entre otras) —
  se subió a `next@14.2.35` (última patch de la rama 14) y se sacó la
  dependencia `uuid` que había quedado sin usar (el código usa
  `crypto.randomUUID()` nativo), lo cual también resolvió su vulnerabilidad
  asociada. Quedan pendientes 5 vulnerabilidades "high" en una copia interna
  de `postcss` que trae el propio `next` empaquetada — requieren saltar a
  `next@16` (breaking change) para resolverse del todo; no se aplicó porque
  el riesgo real es bajo para un proyecto local de demo (necesita CSS
  atacante-controlado, que no es el caso acá).
- **04:35** — `npx tsc --noEmit` limpio, `npm run build` compila sin errores
  (14 rutas generadas), `npm run lint` sin warnings.
- **04:40** — Smoke test end-to-end en navegador (modo mock, sin ninguna key
  cargada):
  - Landing → login → vista familiar: carga la memoria y el recordatorio
    semilla correctamente.
  - Pregunta RAG "contame una historia sobre su esposa" → respuesta correcta
    basada en la memoria semilla (se detectó y arregló un bug: la memoria
    semilla no estaba indexada en el vector store porque se había insertado
    directo en la DB sin pasar por el tool `guardar_memoria`; se agregó un
    backfill automático en `buscarMemoriasSimilares`).
  - Chat de texto "Grillo, recordame tomar la pastilla a las 15:30" →
    Grillo respondió y el recordatorio apareció en el panel al instante.
  - Chat de texto con una anécdota larga ("me acuerdo de cuando era chico en
    mi pueblo...") → se guardó como memoria de forma discreta y apareció en
    la vista familiar.
  - Se resetearon los datos de prueba generados durante el smoke test para
    que el proyecto quede con el seed original y limpio.

## Qué quedó funcionando en modo mock (sin ninguna API key)

- Los 4 flujos completos, de punta a punta, verificados en navegador.
- Conversación por voz (STT/TTS nativos del navegador — funciona mejor en
  Chrome; Firefox no soporta `SpeechRecognition`).
- Creación de recordatorios por conversación natural y desde la vista
  familiar, con aviso en pantalla cuando llega la hora.
- Captura discreta de memorias durante la charla (heurística por palabras
  clave + longitud del mensaje).
- RAG sobre las memorias guardadas desde la vista familiar.
- Botón de emergencia (mockeado, muestra confirmación en pantalla).
- Persistencia en `/data/db.json` y `/data/vectorstore.json` — sobrevive a
  reinicios de `npm run dev` sin necesitar Supabase.

## Qué falta para conectar las APIs reales

1. **Anthropic** (`ANTHROPIC_API_KEY`): el system prompt y las 5 tools ya
   están listos; solo hace falta la key. Verificar que el modelo
   `claude-sonnet-4-6` (configurable vía `ANTHROPIC_MODEL`) siga siendo el
   id correcto al momento de activarlo — si cambió, ajustar esa env var.
2. **ElevenLabs / OpenAI Whisper**: las rutas `/api/tts` y `/api/stt` están
   implementadas y probadas en su rama mock, pero **no están conectadas al
   frontend** — `VoiceChat.tsx` llama a `/api/tts` (así que ElevenLabs se
   activa solo con la key), pero el STT sigue usando siempre el navegador.
   Para usar Whisper habría que agregar grabación de audio (`MediaRecorder`)
   en `VoiceChat.tsx` y mandarla a `/api/stt` en vez de depender de
   `SpeechRecognition`.
3. **Pinecone**: crear el índice (dimensión 1536 si se usa
   `text-embedding-3-small`) y cargar `PINECONE_API_KEY` /
   `PINECONE_INDEX`. El código ya sabe indexar y consultar contra Pinecone
   real.
4. **OpenWeatherMap**: solo cargar la key.
5. **Supabase**: correr `supabase/schema.sql` en el SQL editor, después
   cargar `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`. Los
   datos del store local NO se migran automáticamente a Supabase — si
   querés conservar lo que se generó en modo mock, hay que insertarlo a
   mano o escribir un script de migración puntual.

## Recomendación de siguiente paso

1. Cargar `ANTHROPIC_API_KEY` primero — es el cambio de mayor impacto para
   la demo (respuestas mucho más naturales y detección de memorias/tono
   mucho mejor que la heurística mock).
2. Probar la demo un rato en modo mock tal cual está para ajustar tono del
   system prompt o UI antes de gastar crédito real.
3. Si el tiempo alcanza antes de la demo: conectar ElevenLabs (el salto de
   calidez en la voz es el segundo "wow" más notorio después del LLM real) y
   armar el proyecto de Supabase para no depender del JSON local en la
   presentación.
4. Pendiente de decisión de producto (no bloqueante para la demo): definir
   qué pasa con el filtro de "tema fuera de alcance" en el borde —
   actualmente confía en el system prompt; si el tiempo alcanza, se puede
   sumar una segunda capa de validación del lado del servidor antes de
   mandar la respuesta a TTS, tal como sugiere el prompt maestro.
