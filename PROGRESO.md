# PROGRESO — Grillo MVP

Registro de la sesión de construcción autónoma. Todos los timestamps son
aproximados (hora local de la máquina, 2026-08-06).

## Sesión 12 — Detección de ánimo bajo sostenido + gráfico para la familia

Pedido: que Grillo note cuando alguien "lleva un par de días triste" y le
avise a la familia con contexto concreto (no solo "está triste"), más
gráficos de evolución del ánimo inspirados en la app Yana.

**Vocabulario cerrado de emociones** (`src/lib/emociones.ts`): antes
`emocion_detectada` era texto libre de Claude ("un poco triste", "medio
nostálgico"...) — imposible de agregar. Ahora la tool `guardar_memoria`
restringe a 9 valores fijos, cada uno con una valencia 1-5, lo que permite
graficar una evolución real en el tiempo.

**Detección de patrón** (`src/lib/animo.ts`): tras guardar una memoria,
si el promedio de valencia de los recuerdos de los últimos 4 días es bajo
(≤2, o sea tristeza/soledad/preocupación sostenida) y hay al menos 3
recuerdos en la ventana (para no disparar por un evento aislado), Grillo
le pide a Claude que redacte una nota corta y concreta a partir de lo que
la persona realmente contó, y se la manda por correo a cada familiar
vinculado. Throttle de 48hs para no repetir el aviso todos los días.

**Decisión de producto, no solo técnica**: no se construyó nada parecido
a las pantallas de "Evaluación de depresión/ansiedad/autoestima" con
niveles de severidad que se ven en Yana — eso simularía una escala clínica
sin validar, dando una falsa sensación de certeza médica que Grillo no
tiene forma de respaldar (mismo principio que ya rige las reglas del
system prompt sobre no dar diagnósticos). Se optó por observación de
patrón + sugerencia de contacto humano.

**UI nueva**: `EstadoAnimoFamiliar.tsx` en `/familia` — gráfico de línea
SVG (sin librerías) de la evolución de los últimos 14 días, con hover, y
una barra de distribución bajo/neutral/alto. Paleta propia de Grillo
(clay/sand/gold), no la de Yana.

**Verificado en vivo, con datos reales**: se le contaron a Grillo (como
Rosa) tres historias tristes distintas en la misma sesión — la alerta se
disparó con un resumen que mencionaba puntualmente a su esposo fallecido
(Jorge) y el aniversario, se logueó el correo mock a Pedro, y el gráfico +
la barra de distribución se vieron correctos en `/familia`. Se encontró y
corrigió un detalle en el camino: el resumen de Claude a veces traía
`**negrita**` en markdown que se mostraba como asteriscos literales — se
agregó instrucción explícita de texto plano más un saneo de respaldo.
Datos de prueba borrados de Supabase y Pinecone al terminar.

## Sesión 11 — Límite de uso diario para no quemar créditos de Claude

Preocupación real: sin ningún control, un loop o un uso intensivo del chat
puede consumir crédito de la API de Anthropic sin aviso. Se agregó:

1. **Techo de mensajes por persona mayor** en una ventana móvil de 24hs
   (`LIMITE_MENSAJES_DIARIOS`, default 60). Se cuenta con
   `contarConversacionesDesde` (un `select count` liviano sobre
   `conversaciones`, sin traer las transcripciones completas). Al llegar al
   techo, `/api/chat` no llama más a Claude — responde con un mensaje fijo
   ("Hoy ya charlamos bastante...") sin gastar tokens, y esa respuesta no
   cuenta como uso nuevo (si contara, seguiría empujando la ventana).
2. **Logueo de tokens reales** (`tokens_entrada`/`tokens_salida` de la
   respuesta de Anthropic) por cada conversación completa, para tener
   visibilidad del consumo real en los logs del servidor en vez de estimarlo
   a partir de la cantidad de mensajes.

**Verificado en vivo**: se bajó el límite a 2 temporalmente (solo en
`.env.local`, revertido después), se mandaron 3 mensajes reales como
Manuel Silva — los primeros dos generaron respuesta real de Claude (con
tokens logueados), el tercero se cortó localmente sin tocar la API. Se
limpiaron las conversaciones de prueba al terminar.

**Pendiente**: estos límites no están todavía atados a los planes de
suscripción (Básico/Cada Día/Familia Grande) que se conversaron con
Cecilia — hoy es un único techo parejo para todas las cuentas. Cuando haya
sistema de pagos, el límite debería leer el plan de cada familia en vez de
una constante fija.

## Sesión 10 — Notificación real de emergencia, dispositivos vinculados, chat sin doble scroll, anti-duplicado de historias

Tras una revisión honesta de la UI y las funcionalidades pendientes, se
implementaron las cuatro mejoras recomendadas:

1. **Notificación real de emergencia**: el mayor hallazgo de la revisión —
   "Ya avisé a tu familia" era mentira en la práctica, porque solo
   escribía una fila en la base y la familia se enteraba únicamente si
   tenía la vista `/familia` abierta (poll cada 8s). Ahora `/api/emergencia`
   además le manda un correo a cada familiar vinculado, usando un módulo
   nuevo ([email.ts](src/lib/notify/email.ts)) con el mismo patrón
   real/mock del resto del proyecto: si hay `RESEND_API_KEY`, manda el
   correo de verdad vía Resend; si no, lo loguea en la consola del
   servidor y la alerta se sigue guardando igual. Verificado en vivo: al
   disparar la alerta como Rosa, el log del servidor mostró el correo
   dirigido a `pedro.gonzalez@example.com` (su familiar vinculado real,
   resuelto vía `auth.admin.getUserById`).
2. **Dispositivos vinculados**: nueva sección en `/familia`
   ([DispositivosVinculados.tsx](src/components/DispositivosVinculados.tsx))
   que lista los dispositivos de la persona mayor y permite revocarlos
   — usa las rutas `GET`/`DELETE /api/dispositivos` que ya existían pero
   no tenían UI. Verificado: se vinculó un dispositivo de prueba, apareció
   en la lista, se revocó, y se confirmó en la base que la fila
   desapareció.
3. **Chat sin doble scroll**: `VoiceChat.tsx` tenía un contenedor interno
   con su propio scroll (`max-h-[42vh] overflow-y-auto`), separado del
   scroll de la página — confuso en mobile, sobre todo para el público de
   Grillo. Se sacó el scroll interno; ahora el cuadro de charla crece con
   la página y hace `scrollIntoView` al último mensaje.
4. **Anti-duplicado de historias**: además del fix de la Sesión 9 (la
   causa raíz del duplicado), se agregó una red de seguridad extra en
   `guardar_memoria` ([executor.ts](src/lib/tools/executor.ts)): si el
   resumen nuevo tiene una similitud de texto alta (≥75%, por solapamiento
   de palabras) con una memoria guardada en las últimas 6 horas, no la
   vuelve a guardar. Verificado en vivo: se le contó dos veces la misma
   historia a Manuel Silva y solo quedó una fila en `memorias`.

De paso se encontró y sacó voseo que había quedado en `.env.example` y
`README.md` — las barridas de las Sesiones 4 y 8 solo cubrían `src/`.

`tsc` y `eslint` limpios en todos los archivos tocados. Se borraron todos
los datos de prueba generados durante la verificación (memorias,
conversaciones, alerta de emergencia, dispositivo, vectores de Pinecone).

## Sesión 9 — Voz de ElevenLabs conectada + español neutro en las respuestas de la IA (no solo en la UI) + conciencia horaria

**Voz real de ElevenLabs**: la voice ID que estaba configurada
(`l1zE9xgNpUTaQCZzpNJa`, una voz de la Voice Library / comunidad) devolvía
`402 paid_plan_required` — ElevenLabs bloquea las voces de biblioteca vía
API en cuentas free ("Free users cannot use library voices via the API").
Se detectó llamando directo al endpoint de TTS con curl y leyendo el cuerpo
del error. Se cambió a una voz "premade" (Sarah, `EXAVITQu4vr4xnSDxMaL`),
que sí está permitida en el plan gratuito — confirmado con curl (200, MP3
real) y después en la app real: login como Rosa, mensaje de prueba, y la
respuesta de `/api/tts` trae `audioBase64` con un MP3 real, no el fallback
mock (`useBrowserTTS: true`).

**Bug encontrado al probarla: voseo argentino en las respuestas de la IA**.
Las sesiones 4 y 8 habían limpiado el voseo de todo el texto *fijo* de la
UI, pero el texto que genera Claude en la charla es dinámico — y el
system prompt (`buildSystemPrompt` en
[definitions.ts](src/lib/tools/definitions.ts)) nunca decía explícitamente
que evitara el voseo, así que en una prueba real le dijo "vos" a Rosa. Se
agregó una regla explícita y con ejemplos concretos ("vos", "tenés",
"contame", "sabés", "sos" prohibidos; usar "tú/tienes/cuéntame") tanto en
el system prompt principal ([definitions.ts](src/lib/tools/definitions.ts))
como en el de `preguntarMemorias` para la vista familiar
([ragAsk.ts](src/lib/ai/ragAsk.ts)), que tenía el mismo hueco.

**De paso, conciencia horaria**: en la misma prueba, Grillo saludó como si
recién amaneciera de noche. Se agregó `describirMomentoActual()` en
[claude.ts](src/lib/ai/claude.ts), que calcula día de la semana y franja
horaria (mañana / mediodía / tarde / noche / madrugada) en huso horario
`America/Santiago` y se inyecta en el system prompt para que el saludo y
las referencias al momento del día sean coherentes con la hora real del
usuario, no con la hora del servidor ni una suposición fija.

**Verificación en la app real** (no solo con curl): login con
`rosa.gonzalez@example.com`, mensaje "Hola Grillo, ¿cómo estás?" un jueves
por la noche → respuesta real: *"¡Hola, Rosa! Qué gusto que te asomes por
aquí esta noche. Yo bien, con ganas de charlar un rato contigo. ¿Cómo
estás tú? ¿Cómo terminó el día?"* — español neutro correcto y franja
horaria correcta, ambos confirmados en una sola respuesta real de la API.

## Sesión 8 — Español neutro (otra vuelta) + recuperación de cuenta + invitar a un familiar

**Corrección de idioma**: se me volvió a colar voseo en todo lo nuevo de la
Sesión 7 ("te llamás", "decime", "pedile", "Creá tu cuenta", etc.), y de
paso aparecieron dos casos viejos que se me habían escapado en pases
anteriores (`login/page.tsx` y `registro/page.tsx`). La barrida anterior
usaba `grep` sensible a mayúsculas y no encontraba cosas como "Creá" con
mayúscula inicial — esta vez se hizo case-insensitive para no repetir el
error. Barrida final sobre todo `src/` sin resultados.

**Las dos funciones que faltaban, ambas construidas:**

### 1. Recuperación de cuenta
`/recuperar-cuenta` (pedís tu email) → Supabase manda un link de reseteo →
`/restablecer-contrasena` (recibe el link, ya trae una sesión temporal,
elegís una contraseña nueva) → entra directo a `/abuelo` o `/familia` según
el rol de la cuenta. Es el flujo estándar de Supabase Auth
(`resetPasswordForEmail` + `updateUser`), con un aviso explícito en la
pantalla de que un familiar puede hacer este paso por la persona mayor si
hace falta. Enlazado desde `/login` en las dos pestañas.

### 2. Invitar a un familiar como acompañante
Nueva sección en `/abuelo` ("Invitar a un familiar como acompañante") con
un campo de correo y relación. Usa `admin.inviteUserByEmail` de Supabase
—el mecanismo de invitación por correo que ya trae Auth de fábrica— y le
adjunta el `abuelo_id` como metadata del usuario invitado, así
`/api/invitaciones/aceptar` sabe a qué perfil vincularlo **sin que el
cliente mande el id** (misma regla de todo el proyecto: el servidor
resuelve, nunca confía en lo que llega del navegador). El familiar
invitado hace clic en el mail, cae en `/invitacion` con una sesión
temporal, pone su nombre y elige contraseña, y queda vinculado al mismo
abuelo — sin pasar por el onboarding de "crear tu propio abuelo", porque ya
tiene uno asignado.

De paso quedó corregido un bug real que encontré probando esto: el login
manual (pestaña "Soy familiar") siempre mandaba a `/familia` sin mirar el
rol de la cuenta — si una persona mayor autoregistrada lo usaba por
error (o volvía por `/restablecer-contrasena`), terminaba en el panel
administrativo en vez de su pantalla de conversación. Ahora chequea el rol
igual que ya lo hacía `/restablecer-contrasena`.

**Configuración de Supabase tocada**: se agregó `http://localhost:3000/**`
a la lista de redirects permitidos (`uri_allow_list`) — sin esto, Supabase
ignora el `redirectTo` personalizado y manda todos los links de mail a la
raíz del sitio. Se intentó traducir los templates de mail de invitación/
recuperación al español, pero **Supabase no permite personalizar el
contenido de los mails en el plan gratuito con el proveedor de correo por
defecto** (pide plan pago o SMTP propio) — quedan en inglés por ahora, es
una limitación de infraestructura, no de código.

**Verificación — con un límite real encontrado en el camino**: se probó
`/registro-mayor` de punta a punta (cuenta real creada). Al probar
`/api/invitaciones` con un email de prueba, Supabase lo rechazó como
inválido, y los siguientes intentos chocaron con **rate limit de envío de
mails** — el plan gratuito de Supabase con su proveedor de correo por
defecto es muy restrictivo (pensado para probar, no para volumen). No se
pudo hacer clic en un mail real dentro de esta sesión. Se verificó la
lógica igual, de forma directa: se creó un usuario con la Admin API con la
misma metadata que dejaría una invitación real, se generó su sesión, y se
llamó a `/api/invitaciones/aceptar` tal como lo haría `/invitacion` —
quedó vinculado correctamente al abuelo del invitador, y `GET /api/perfil`
confirmó que ve los datos correctos. La mecánica está probada; lo único no
verificable en esta sesión es la entrega real del correo, que depende del
proveedor de mail y no del código. Se borraron las cuentas y filas de
prueba al terminar. `tsc`, `next build` y `eslint` limpios.

**Pendiente / no bloquea nada de esto**: si se necesita mandar más
invitaciones o recuperaciones de las que el rate limit gratuito de
Supabase permite, hace falta conectar un proveedor SMTP propio (o subir de
plan) — normal para llegar a producción, no urgente para la demo. Tampoco
hay todavía una lista de "invitaciones pendientes" visible para la persona
mayor (solo ve "invitación enviada" al momento, sin historial).

## Sesión 7 — La persona mayor también puede crear su propia cuenta

Hasta acá, la persona mayor solo podía usar Grillo si un familiar la daba
de alta primero (creaba su perfil y vinculaba el dispositivo). El usuario
señaló un caso real importante: hay adultos mayores — por ejemplo con
Alzheimer o problemas de memoria — para quienes Grillo es sobre todo una
herramienta de compañía y de recordar cosas por sí misma, y no siempre va
a haber un familiar armando la cuenta de antemano. Pidió que la persona
mayor también pudiera registrarse sola, con a Grillo acompañándola paso a
paso (no un formulario frío), y que ese dispositivo tampoco vuelva a pedir
login nunca — la misma barra que ya se le puso al flujo familiar-vincula-
dispositivo.

**Diseño**: es un segundo camino de alta, en paralelo al existente (no lo
reemplaza). La persona mayor termina con una cuenta real de Supabase Auth
(`usuarios.rol = 'abuelo'` con su propio `auth_user_id`, en vez de depender
de un token de dispositivo ajeno) y su propio perfil de abuelo autovinculado.

- **`POST /api/registro-mayor`** (nueva): recibe nombre + correo, crea el
  usuario de Auth **ya confirmado** con la Admin API de Supabase
  (`email_confirm: true`) — se salteó a propósito la confirmación por mail
  que sí tiene el registro familiar, porque para este público es fricción
  real, no un paso menor. La contraseña la genera el servidor (palabra
  simple + 4 dígitos, ej. `mate6700`) — Grillo la "crea", la persona no
  tiene que inventar ni recordar nada, se muestra una sola vez en la
  pantalla final por si algún familiar la necesita después. Crea de una
  el `usuarios` (rol `abuelo`) y su `abuelos` propio, ya vinculados entre sí.
- **`requireAbueloAccess`** (nuevo helper en `lib/auth/server.ts`): unifica
  las dos formas de acceder al lado del abuelo — token de dispositivo O
  sesión propia de Supabase con `rol='abuelo'`. Las rutas que ya usaban
  `requireAbueloDevice` (`/api/chat`, `/api/abuelos` GET,
  `/api/emergencia`) pasaron a usar este helper; `/api/recordatorios` GET
  ahora prueba `requireAbueloAccess` y si falla cae a
  `requireFamiliarConAbuelo`, así sirve a las tres audiencias (dispositivo
  vinculado, cuenta propia, o familiar administrando).
- **`fetchAbuelo()`** (en `lib/auth/fetchConAuth.ts`) ahora prueba el token
  de dispositivo primero y, si no hay, manda el JWT de la sesión propia —
  ningún componente del lado del abuelo (`VoiceChat`, `RecordatoriosPanel`,
  `BotonEmergencia`) tuvo que cambiar, porque ya usaban esta función.
- **`/registro-mayor`** (nueva página): el asistente de Grillo — pantalla
  de bienvenida → nombre → correo → confirmar → listo, una pregunta por
  pantalla, botones grandes, y **narración por voz** en cada paso con
  `useSpeechSynthesis` (la misma síntesis de voz del navegador que ya usa
  el chat) — Grillo literalmente habla cada instrucción, no solo la
  escribe. Al terminar, inicia sesión en ese navegador con las credenciales
  recién creadas y redirige a `/abuelo` — de ahí en más la sesión persiste
  sola (mismo mecanismo de Supabase que ya mantenía logueado al familiar),
  nunca vuelve a pedir nada.
- **`/login`**: la pestaña "Soy la persona mayor" ahora primero chequea si
  ya hay acceso (token O sesión propia); si no hay ninguna, muestra el
  nuevo llamado a la acción — *"¿Te gustaría la compañía y ayuda de
  Grillo? Creá tu cuenta en unos pasos sencillos — yo mismo te voy
  guiando."* — con un botón grande a `/registro-mayor`, y como texto
  secundario más chico la opción de que un familiar la vincule. `/abuelo`
  (la pantalla "este dispositivo no está configurado") también ofrece
  ahora el mismo botón de crear cuenta propia, para quien llegue directo
  ahí sin pasar por `/login`.

**Verificado real, no simulado**: se creó una cuenta de prueba navegando
el asistente completo (bienvenida → "Don Alberto" → email de prueba →
confirmar → cuenta creada al instante, sin esperar mail), se entró a
`/abuelo` sin ningún token de dispositivo — solo con la sesión propia — y
se le pidió por voz "recuérdame tomar agua a las 11:00": Claude real llamó
a `crear_recordatorio` y quedó guardado, confirmando que
`requireAbueloAccess` resuelve bien el camino de sesión propia end-to-end.
Se borró la cuenta de prueba y sus filas asociadas al terminar.
`tsc`, `next build` y `eslint` limpios.

**Pendiente / no bloquea nada de esto**: si esta persona mayor pierde la
sesión de este dispositivo (borra el navegador, cambia de equipo), hoy no
hay un flujo de "recuperar cuenta" — tendría que usar el correo y la
contraseña generada tal cual se le mostró una vez, o que un familiar la
ayude manualmente contra Supabase. Tampoco hay todavía forma de que un
familiar "reclame" o se vincule después a una cuenta que la persona mayor
creó por su cuenta (quedan como dos mundos separados hasta que se
construya esa función).

## Sesión 6 — Multi-tenant real: login con Auth + aislamiento por familia

El usuario preguntó si el login usaba Auth de verdad, porque no quería que
una familia pudiera ver los datos de otra. Respuesta corta: no lo tenía —
el "login" de la v1 era un botón que escribía un objeto en `localStorage`,
sin contraseña ni verificación de servidor, y las rutas `/api/*` aceptaban
cualquier `abueloId` que mandara el cliente. Con más de una familia real
eso es un agujero de seguridad real, no cosmético. Se rediseñó la
autenticación de punta a punta.

**Diseño acordado con el usuario:**
- **Familiar**: cuenta real con Supabase Auth (email + contraseña).
- **Persona mayor**: sin login — el familiar vincula el dispositivo (tablet/
  notebook) una sola vez desde su cuenta; queda un token propio guardado en
  ese navegador que nunca vence y nunca vuelve a pedir sesión (mismo patrón
  que "activar dispositivo" de las apps de Smart TV).
- El servidor **nunca** confía en un `abueloId` que mande el cliente — lo
  resuelve siempre él mismo a partir de una credencial verificable (el JWT
  de Supabase para el familiar, o el token de dispositivo para la tablet).

**Base de datos** (`supabase/schema.sql`, aplicado en vivo):
- `usuarios.auth_user_id` → liga una fila de `usuarios` a una cuenta real
  de `auth.users`.
- Tabla nueva `abuelo_dispositivos` (token largo no adivinable, nombre del
  dispositivo, quién lo vinculó, último acceso).
- Políticas RLS por familia en las 6 tablas (`abuelo_id in (select
  abuelo_id from usuarios where auth_user_id = auth.uid())`) — capa extra
  por si alguna vez se llama a Supabase directo desde el cliente; la
  autorización real vive en el código del servidor.

**Backend nuevo** (`src/lib/auth/server.ts`):
- `requireFamiliar` / `requireFamiliarConAbuelo`: valida el
  `Authorization: Bearer <jwt>`, resuelve el usuario y su abuelo.
- `requireAbueloDevice`: valida el header `X-Device-Token`, resuelve el
  abuelo directo.
- Las 12 rutas `/api/*` que tocan datos de un abuelo se reescribieron para
  usar estos helpers en vez de leer `abueloId` del query string o del body.
  Nuevas rutas: `/api/perfil` (alta del familiar), `/api/abuelos` (crear el
  perfil de la persona mayor + que la tablet consulte su propio nombre),
  `/api/dispositivos` (vincular/listar/revocar tablets).

**Frontend nuevo**:
- `/login` (rehecho): tab familiar con email+contraseña real, tab "soy la
  persona mayor" que solo revisa si el dispositivo ya está vinculado.
- `/registro`: alta con confirmación por email (Supabase Auth estándar).
- `/familia`: ahora es una máquina de estados — sesión → perfil (si falta,
  `OnboardingPerfil`) → abuelo (si falta, `OnboardingAbuelo`) → dashboard.
  Se agregó `VincularDispositivo.tsx`.
- `/abuelo`: si no hay token de dispositivo guardado, muestra una pantalla
  explicando que hay que vincularlo desde la cuenta del familiar — nunca
  un formulario de login.
- Se sacó `src/lib/session.ts` (el login falso) y se creó
  `src/lib/auth/{familiarSession,deviceToken,fetchConAuth}.ts` para
  reemplazarlo. Todos los componentes que antes recibían `abueloId` como
  prop y lo mandaban en la URL ahora usan `fetchFamiliar()`/`fetchAbuelo()`,
  que agregan la credencial correcta y dejan que el servidor resuelva todo.

**Terminología**: a mitad de la implementación el usuario pidió sacar la
palabra "abuelo/a" de todo el texto visible (la encontró poco respetuosa
para alguien mayor), dejando el modelo de datos como está porque
renombrarlo no valía la pena. Se cambió todo lo que se ve en pantalla
("Soy el abuelo/a" → "Soy la persona mayor", placeholders, mensajes de
error que llegan a mostrarse, botón "Abrir como {nombre real}") sin tocar
nombres de tablas, rutas, funciones ni componentes — exactamente lo que
pidió.

**Verificación real, no solo visual**: se crearon dos cuentas de prueba
confirmadas por API (sin depender del email), se completó el alta de las
dos (perfil + persona mayor + vínculo de dispositivo) navegando la app de
verdad, y se confirmó que la **familia B arranca completamente vacía y
nunca ve nada de la familia A** — ni un dato, ni un rastro — porque
estructuralmente no hay forma de pedirle a la API los datos de otro abuelo
sin su credencial. Se limpiaron las dos cuentas de prueba y sus filas
huérfanas al terminar. `tsc`, `next build` y `eslint` limpios.

**Pendiente / decisiones para más adelante** (no bloquea la demo):
- Una cuenta familiar administra un único abuelo por ahora (no hay soporte
  para "dos abuelos" en una misma cuenta ni para invitar a otro familiar al
  mismo abuelo).
- Los recordatorios con múltiples avisos de anticipación (24h/12h/5h antes
  de una cita) y que Grillo pueda "llamar" a un familiar siguen anotados
  desde la Sesión 5, sin tocar todavía.
- Si algún día se borra una cuenta familiar, el perfil de la persona mayor
  y sus recordatorios/memorias quedan huérfanos en vez de borrarse en
  cascada — no hay flujo de "cerrar cuenta" construido aún, así que no era
  prioridad resolverlo ahora.

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
