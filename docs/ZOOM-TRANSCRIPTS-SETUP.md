# Guía Operativa: Zoom Webhooks + Ingesta Automática de Transcripts (Happy Dreamers)

Guía actualizada y verificada para configurar Zoom y lograr que los transcripts de grabaciones en la nube lleguen automáticamente a la app (Mongo → Dashboard → Consultas → History). Incluye solo lo que funciona hoy, con pasos concretos y troubleshooting probado en este proyecto.

Índice
- Arquitectura y flujo
- Requisitos previos
- Variables de entorno (local y Vercel)
- Endpoints implicados
- Validación del Webhook en Zoom (challenge y opción por cabecera)
- Activación/instalación de la app S2S en Zoom
- Pruebas rápidas (curl) y verificación
- Ingesta automática (poller) y manual
- Enlace con la UI y buenas prácticas
- Troubleshooting (errores comunes y soluciones)
- Checklist final (end‑to‑end)

---

## Resumen operativo (lo verificado y lo pendiente)

Lo que ya funciona (verificado en producción):
- Endpoint live `GET https://<dominio>/api/integrations/zoom/webhook` → responde `{ success: true }`.
- Challenge estándar (POST con `plainToken`) devuelve `{ plainToken, encryptedToken }` con HMAC correcto en formato hex usando `ZOOM_WEBHOOK_SECRET`.
- Opción alternativa habilitada: validación por GET con cabecera `Authorization` usando `ZOOM_VERIFICATION_TOKEN` (si la activas).

Lo que falta para cerrar end‑to‑end:
- En Zoom → Feature → Event Subscriptions: usar la URL EXACTA `/api/integrations/zoom/webhook` (sin barra final), pulsar Save y luego Validate.
- Si el Validate sigue fallando: activar “Authentication Header Option”, poner el mismo token en Authorization y en Vercel `ZOOM_VERIFICATION_TOKEN`, redeploy, Save → Validate.
- Tras validar: Activation → Install/Enable la app S2S (sin esto el token da `invalid_client`).
- Probar token S2S (curl). Si devuelve `access_token`, ejecutar el poller y verificar transcripts en la UI.

---

## Arquitectura y flujo

- Zoom Server‑to‑Server OAuth:
  - Se solicita un access_token con `account_id`, `client_id`, `client_secret` (app S2S instalada en tu cuenta).
  - Se usa ese token para consumir la API de grabaciones y descargar transcripts.

- Webhook de Zoom:
  - Endpoint: `/api/integrations/zoom/webhook`.
  - Responde al handshake de validación (`endpoint.url_validation`) con HMAC correcto usando `ZOOM_WEBHOOK_SECRET`.
  - En eventos `recording.completed` registra una “session stub” y puede intentar una ingesta temprana.

- Poller (cron o manual):
  - Endpoint: `/api/integrations/zoom/poller`.
  - Lista grabaciones por rango de fechas, guarda/actualiza sesiones y llama a la ingesta si hay transcript.

- Ingesta:
  - Núcleo en `lib/integrations/zoom.ts` → descarga `VTT/TXT`, normaliza, analiza y guarda en `consultation_reports`.
  - Endpoint puntual: `/api/integrations/zoom/ingest`.

- UI (Dashboard → Consultas → History):
  - Lee `consultation_reports` para mostrar el historial. Si se vinculó correctamente a `childId`/`userId`, aparece sin intervención.

Colecciones usadas en Mongo
- `consultation_sessions`: rastreo de reuniones/estado.
- `consultation_reports`: transcript + análisis + metadatos (consumido por la UI).

---

## Requisitos previos

- Cuenta de Zoom con permisos de administrador.
- App en Zoom Marketplace de tipo “Server‑to‑Server OAuth” (nivel cuenta).
- En Zoom Admin → Settings → Recording:
  - Cloud Recording = ON
  - Audio Transcript = ON
- Scopes mínimos en la app S2S (App → Scopes):
  - Recording (lectura a nivel cuenta), por ejemplo: “View all user recordings (admin)” y “View cloud recording transcripts (admin)”.
  - Estos scopes desbloquean los eventos de Recording en la sección “Add Events”.
- Acceso al proyecto (local y/o Vercel) para definir variables de entorno y hacer deploy.

---

## Variables de entorno

Defínelas tanto en local (`.env`) como en Vercel (Project → Settings → Environment Variables). No compartas secretos públicamente.

Obligatorias
- `ZOOM_ACCOUNT_ID` → de tu app S2S (copiar/pegar exacto desde Zoom).
- `ZOOM_CLIENT_ID` → de tu app S2S.
- `ZOOM_CLIENT_SECRET` → de tu app S2S.
- `ZOOM_WEBHOOK_SECRET` → token secreto que debes poner idéntico en Zoom “Secret Token”.

Recomendadas
- `ZOOM_USER_ID` → `me` para pruebas o el email/ID Zoom cuyo contenido listarás.
- `CRON_SECRET` → secreto para autorizar llamadas a poller/ingest (`Authorization: Bearer ...`).

Opcionales
- `ZOOM_VERIFICATION_TOKEN` → solo si habilitas en Zoom “Authentication Header Option” y quieres validar con header. No reemplaza al challenge estándar.
- `OPENAI_API_KEY` / `GEMINI_API_KEY` → para análisis IA más rico (si no están, el análisis será de “borrador”).

Ejemplo `.env` local (plantilla)
```
ZOOM_ACCOUNT_ID=xxxxxxxxxxxxxxxxxxxxxxxx
ZOOM_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxx
ZOOM_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
ZOOM_WEBHOOK_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
ZOOM_USER_ID=me
CRON_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
# ZOOM_VERIFICATION_TOKEN=opcional_si_usas_cabecera
# OPENAI_API_KEY=...
# GEMINI_API_KEY=...
```

Tras cambiar variables en Vercel: redeploy para aplicarlas.

---

## Endpoints implicados (servidor)

- Webhook: `POST /api/integrations/zoom/webhook`
  - Handshake: recibe `{ event: "endpoint.url_validation", payload: { plainToken } }` → responde `{ plainToken, encryptedToken }`.
  - Si falta `ZOOM_WEBHOOK_SECRET` → 500 (fail‑fast para visibilizar misconfiguración).

- Poller: `GET /api/integrations/zoom/poller`
  - Query: `from=YYYY-MM-DD`, `to=YYYY-MM-DD`, `page_size`, `userId` (default `me`).
  - Header: `Authorization: Bearer ${CRON_SECRET}` (si definido; en dev sin `CRON_SECRET` permite libremente).

- Ingest puntual: `POST /api/integrations/zoom/ingest`
  - Body: `{ meetingId?: string|number, uuid?: string, childId?: string, userId?: string }`.
  - Header: `Authorization: Bearer ${CRON_SECRET}`.

- Debug (solo admin, navegador con sesión): `GET /api/integrations/zoom/debug`
  - Muestra `token_ok`, `api_ok`, y diagnóstico de entorno.

---

## Validación del Webhook en Zoom

ATENCIÓN: La URL debe apuntar EXACTAMENTE a `/api/integrations/zoom/webhook`. No usar `/api/integrations/zoom/` (sin `webhook`) ni agregar barra final.

1) En Zoom Marketplace → tu app → Feature → Event Subscriptions
   - Event Subscriptions: ON
   - Secret Token: pon EXACTAMENTE el mismo valor de `ZOOM_WEBHOOK_SECRET` de Vercel.
   - Add Event Subscription:
     - Method: Webhook
     - Endpoint URL: `https://<tu-dominio-vercel>/api/integrations/zoom/webhook` (sin barra al final)
     - Add Events: al menos “Recording.completed”.
   - MUY IMPORTANTE: pulsa “Save” antes de “Validate”.

2) Presiona “Validate”
   - Nuestro endpoint ya responde el challenge con HMAC (comprobado). Si falla:
     - “Signature invalid” → Secret Token no coincide 1:1 (re‑pegar y Save).
     - “URL can’t be reached” → revisa espacios en la URL y que el deploy esté activo.
     - “Invalid response” → asegúrate de validar el SUBSCRIPTION (no la sección General) y haber guardado.

3) Opción alternativa (si usas cabecera)
   - Habilita “Authentication Header Option”.
   - En Zoom, campo Authorization: el mismo valor que `ZOOM_VERIFICATION_TOKEN`.
   - En Vercel, añade `ZOOM_VERIFICATION_TOKEN=<mismo valor>` (además de `ZOOM_WEBHOOK_SECRET`).
   - Redeploy. Luego Save → Validate.

Comprobación manual del handshake (curl) — Formato HEX
```
PLAINTOKEN=$(openssl rand -hex 16)
EXPECTED=$(printf "$PLAINTOKEN" | openssl dgst -sha256 -hmac "$ZOOM_WEBHOOK_SECRET" -hex | awk '{print $2}')
curl -s -X POST https://<tu-dominio-vercel>/api/integrations/zoom/webhook \
  -H 'Content-Type: application/json' \
  -d "{\"event\":\"endpoint.url_validation\",\"payload\":{\"plainToken\":\"$PLAINTOKEN\"}}"
# Debe responder: { "plainToken": "$PLAINTOKEN", "encryptedToken": "$EXPECTED" }
```

Nota importante (CRC Zoom): la documentación vigente de Zoom exige que `encryptedToken` sea el HMAC‑SHA256 en formato hexadecimal (no base64). El endpoint de este proyecto ya responde en hex para cumplir con esta verificación.

---

## Activación/instalación de la app S2S (imprescindible)

Tras validar la URL del webhook:

1) Zoom → tu app → Activation → “Install”/“Enable” para TU cuenta.
   - Sin esto, pedir el token S2S devolverá `invalid_client`.

2) Asegúrate de copiar credenciales EXACTAS:
   - `ZOOM_ACCOUNT_ID`, `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET`.
   - Evita confusiones visuales (I mayúscula vs l minúscula). Siempre copiar/pegar desde Zoom.

3) Prueba directa del token (curl)
```
BASIC=$(printf '%s:%s' "$ZOOM_CLIENT_ID" "$ZOOM_CLIENT_SECRET" | base64)
curl -sS -X POST \
  "https://zoom.us/oauth/token?grant_type=account_credentials&account_id=$ZOOM_ACCOUNT_ID" \
  -H "Authorization: Basic $BASIC"
# Esperado: JSON con access_token
```

Si sigue `invalid_client`:
- La app no está instalada/activada, o
- `account_id`/`client_id`/`client_secret` no corresponden al MISMO entorno/app.

---

## Pruebas rápidas (servidor y producción)

- Debug (requiere sesión admin en navegador):
  - `https://<tu-dominio-vercel>/api/integrations/zoom/debug`
  - Esperado: `token_ok: true`, `api_ok: true`.

- Poller (producción):
```
CRON="<CRON_SECRET>"
FROM=2025-01-01
TO=2025-01-07
curl -s -G "https://<tu-dominio-vercel>/api/integrations/zoom/poller" \
  -H "Authorization: Bearer $CRON" \
  --data-urlencode "userId=me" \
  --data-urlencode "from=$FROM" \
  --data-urlencode "to=$TO" \
  --data-urlencode "page_size=5"
# Esperado: { success: true, found: N, inserted: M }
```

- Ingesta puntual (si conoces meetingId/uuid o para forzar vínculo):
```
curl -s -X POST "https://<tu-dominio-vercel>/api/integrations/zoom/ingest" \
  -H "Authorization: Bearer <CRON_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{
    "meetingId": "<ID>",
    "childId": "<mongoIdChild>",
    "userId": "<mongoIdUser>"
  }'
```

---

## Ingesta automática y manual

- Automática vía Poller
  - Llama el endpoint de Zoom para listar grabaciones; por cada reunión crea/actualiza `consultation_sessions`.
  - Si detecta archivo de transcript (VTT/TXT), descarga y analiza → inserta en `consultation_reports`.
  - Si el transcript aún no está listo, verás `reason: "no_transcript_file"` o estado `recording_listed_no_transcript`.

- Manual puntual
  - Usa `/api/integrations/zoom/ingest` con `meetingId` o `uuid` y (opcional) `childId`/`userId` para forzar el vínculo.

Vinculación con paciente/usuario
- Automática por título del meeting (recomendado):
  - Incluye en el topic/título: `[HD child:<mongoIdChild>] [HD user:<mongoIdUser>]`
  - El ingestor extrae estos IDs y vincula el reporte al niño/usuario.
- Alternativa: enviar `childId`/`userId` en la ingesta puntual.

---

## UI — Ver los transcripts

1) Inicia la app local y accede con un usuario admin.
2) Ve a `Dashboard → Consultas` y selecciona Usuario/Niño.
3) Abre el tab “History”: carga desde `consultation_reports` ordenado por fecha.
4) Si no aparece:
   - Verifica que el reporte tenga `childId`/`userId` correctos (vínculo).
   - Revisa logs del servidor y `consultation_sessions` para el estado.

---

## Troubleshooting (causas y soluciones)

Validación del webhook falla (Zoom → Validate)
- “Signature invalid” → El `Secret Token` en Zoom no coincide con `ZOOM_WEBHOOK_SECRET` (re‑pega, Save y revalida).
- “URL can’t be reached” → Verifica que la URL no tenga espacios y que el deploy esté arriba.
- “Invalid response” → Asegúrate de validar la suscripción guardada; nuestro endpoint responde `{ plainToken, encryptedToken }`.
- Opción cabecera: habilita “Authentication Header Option” y define también `ZOOM_VERIFICATION_TOKEN` (mismo valor en Zoom y Vercel), luego Save y Validate.

`invalid_client` al pedir token S2S
- La app S2S no está “Installed/Activated” en tu cuenta.
- Mezcla de credenciales de entornos distintos (Development vs Production).
- Error al copiar `account_id` (confusión I/l). Copiar/pegar exacto desde Zoom.

Poller devuelve `success:true` pero no hay transcript
- Zoom tarda en generar VTT/TXT tras finalizar la reunión (espera 2–10 min).
- Asegura “Audio Transcript = ON” en Zoom.

No aparece en la UI (History)
- El reporte no quedó vinculado a `childId`/`userId`.
  - Usa el patrón de título `[HD child:...] [HD user:...]` o ingesta puntual con IDs.
- Verifica en Mongo que el documento esté en `consultation_reports`.

HTTP 401 en `/api/integrations/zoom/debug`
- Ese endpoint exige sesión admin; ábrelo en el navegador logueado.

---

## Automatización (CRON)

- Configura un cron externo o Vercel Cron para llamar periódicamente:
  - `GET https://<tu-dominio-vercel>/api/integrations/zoom/poller`
  - Header: `Authorization: Bearer <CRON_SECRET>`
  - Rango de fechas razonable (p. ej., últimos 7 días) y `page_size` moderado.

---

## Checklist final (end‑to‑end)

1) En Zoom Admin: Cloud Recording = ON, Audio Transcript = ON.
2) Variables en Vercel/local: `ZOOM_ACCOUNT_ID`, `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET`, `ZOOM_WEBHOOK_SECRET`, `CRON_SECRET` y opcional `ZOOM_USER_ID` (`me`).
3) Webhook: configura Secret Token = `ZOOM_WEBHOOK_SECRET`, agrega evento `Recording.completed`, Save → Validate (o usa opción de cabecera + `ZOOM_VERIFICATION_TOKEN`).
4) Activation: “Install/Enable” la app S2S en tu cuenta.
5) Token S2S (curl) devuelve `access_token`.
6) Poller (curl) devuelve `{ success: true, found, inserted }` y estados razonables.
7) Reunión real con transcript disponible → aparece en `Dashboard → Consultas → History` para el niño vinculado.

---

Notas de seguridad
- Nunca publiques `client_secret`, `account_id` ni secretos del webhook/cron.
- Rota secretos si se compartieron accidentalmente y restringe acceso a variables en Vercel.
