# Grillo 🦗

Asistente de IA de compañía para adultos mayores. Conversa por voz, ayuda con
recordatorios, y captura silenciosamente anécdotas e historias de vida
("Legado Vivo") para que la familia pueda redescubrirlas después.

Este es un **MVP de demo**, no un producto de producción.

## Cómo correrlo

```bash
npm install
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000).

**No hace falta ninguna API key para probarlo.** Todo el proyecto corre en
"modo mock" por defecto: el LLM, la voz, la búsqueda de memorias y el clima
usan simulaciones realistas o las APIs nativas gratuitas del navegador. Ver
la sección [Modo mock](#modo-mock-sin-api-keys) más abajo.

## Login de la demo

El login es un selector simple (sin contraseña) entre dos usuarios semilla:

- **Soy Carlos** → entra a `/abuelo`, la pantalla de conversación por voz.
- **Soy Ana (familiar)** → entra a `/familia`, la vista de memorias y RAG.

## Los 4 flujos del MVP

1. **Conversación por voz** (`/abuelo`) — tocas el micrófono, hablas, Grillo
   transcribe con la Web Speech API del navegador, le responde un LLM (real o
   mock) y te contesta en voz.
2. **Recordatorios** — pídele a Grillo por voz o texto "recuérdame tomar la
   pastilla a las 9" y queda guardado; también se pueden cargar desde la
   vista familiar. Se muestran en pantalla y avisan cuando llega la hora.
3. **Legado Vivo** — cuando cuentas una anécdota o algo significativo, Grillo
   lo detecta y lo guarda como "memoria" sin interrumpir la charla.
4. **Vista familiar** (`/familia`) — un hijo/nieto ve las memorias
   capturadas, las filtra por tema, y le puede preguntar a la memoria del
   abuelo cosas como "cuéntame una historia sobre mi papá" (RAG).

## Modo mock (sin API keys)

Cada integración externa cae automáticamente a un mock cuando la env var
correspondiente no está seteada — no hace falta tocar código para pasar de
mock a real, solo completar `.env.local`:

| Servicio | Real | Mock (sin key) |
|---|---|---|
| Conversación (LLM + tools) | Claude (Anthropic) | Heurísticas + respuestas cálidas variadas — igual dispara `crear_recordatorio` / `guardar_memoria` / `consultar_clima` según lo que digas |
| Voz → texto | Whisper (vía `/api/stt`, no usado por defecto) | Web Speech API del navegador (gratis, sin key) |
| Texto → voz | ElevenLabs | `SpeechSynthesis` nativo del navegador |
| Memoria vectorial (RAG) | Pinecone | Archivo local `/data/vectorstore.json` con embeddings mock + similitud coseno |
| Embeddings | OpenAI `text-embedding-3-small` | Pseudo-embedding determinístico por hashing de palabras |
| Clima | OpenWeatherMap | Dato aleatorio de una lista de climas de ejemplo |
| Base de datos | Supabase (Postgres) | Archivo local `/data/db.json`, mismo modelo de datos, se auto-inicializa con datos de ejemplo (Carlos, Ana, un recordatorio y una memoria) |

Ver [`.env.example`](.env.example) para la lista completa de variables, qué
hace cada una, y dónde conseguir cada key.

## Estructura del proyecto

```
src/
├── app/                    # Next.js App Router
│   ├── page.tsx             # landing
│   ├── login/                # selector de usuario demo
│   ├── abuelo/                # conversación por voz + recordatorios
│   ├── familia/                # memorias + RAG + alta de recordatorios
│   └── api/                   # chat, stt, tts, clima, recordatorios, memorias
├── components/               # VoiceChat, RecordatoriosPanel/Familiar, MemoriasList, PreguntaMemoria
├── hooks/                     # useSpeechRecognition, useSpeechSynthesis (Web Speech API)
└── lib/
    ├── ai/                     # claude.ts, stt.ts, tts.ts, embeddings.ts, pinecone.ts, weather.ts (switch mock/real)
    ├── db/                      # localStore.ts (JSON), supabaseStore.ts, index.ts (dispatcher)
    ├── tools/                   # system prompt + tool schemas para Claude
    ├── session.ts                # "auth" simple en localStorage
    └── types.ts

supabase/schema.sql        # esquema Postgres para cuando se conecte Supabase real
data/                       # store local mock (gitignored, se genera solo)
```

## Pasar a las APIs reales

1. Copiá `.env.example` a `.env.local`.
2. Pegá las keys que tengas — no hace falta completarlas todas a la vez,
   cada servicio se activa de forma independiente.
3. Si vas a usar Supabase, corré `supabase/schema.sql` en el SQL editor del
   proyecto antes de cargar `NEXT_PUBLIC_SUPABASE_URL` /
   `SUPABASE_SERVICE_ROLE_KEY` (si no, la app sigue usando `/data/db.json`).
4. Reiniciá `npm run dev`. No hace falta cambiar nada de código.

Ver también [`PROGRESO.md`](PROGRESO.md) para el detalle de qué se construyó,
qué quedó mockeado, y qué se recomienda como siguiente paso.
