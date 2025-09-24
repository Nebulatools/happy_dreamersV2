# Integración Zoom — Happy Dreamers

Guía completa para integrar Zoom en Happy Dreamers: modos de autenticación, flujos, endpoints ya disponibles en el repo, configuración en Zoom, variables de entorno, pruebas y buenas prácticas.

Última revisión: 2025-09-23

---

## Objetivo

Convertir sesiones de Zoom en información útil dentro de Happy Dreamers:
- Crear y/o registrar reuniones (opcional).
- Recibir webhooks de grabaciones, descargar transcripciones (VTT/TXT) y normalizarlas.
- Analizar automáticamente el contenido y guardar un `consultation_report` vinculado al niño/usuario.

---

## Modos de Autenticación en Zoom

Zoom ofrece dos enfoques; el repo soporta ambos:

1) Server-to-Server OAuth (S2S) — cuenta de Zoom de la organización
- Uso: listar/consultar grabaciones, descargar transcripts; crear reuniones para usuarios de la misma cuenta.
- Ventajas: sin interacción del usuario final; ideal para back-office y automatizaciones.
- Requisitos: App S2S en Zoom Marketplace + scopes de administrador.

2) OAuth por usuario (User-Managed OAuth) — cada profesional vincula su Zoom
- Uso: si cada consultor/coach usa su propia cuenta de Zoom para crear reuniones y grabarlas.
- Ventajas: reuniones se crean con la cuenta personal del profesional; permisos acotados por usuario.
- Requisitos: App OAuth (user-managed) en Zoom Marketplace; flujo de autorización por usuario.

Recomendación práctica:
- Si todas las reuniones se hacen desde 1–2 cuentas de la organización → usar S2S.
- Si cada profesional usa su propio Zoom → habilitar User-Managed OAuth en paralelo.

---

## Flujo End-to-End (Zoom → Reporte)

1) Se agenda/realiza una reunión de Zoom con grabación en la nube y “Audio transcript” activado.
2) Zoom genera la transcripción; envía el webhook `recording.completed` a Happy Dreamers.
3) El backend usa S2S OAuth para consultar la reunión y detectar el archivo de transcript (VTT/TXT).
4) Se descarga y normaliza el texto; se analiza (LLM stub actual) y se guarda en `consultation_reports`.
5) El registro queda vinculado a niño/usuario. Auto‑vinculación si el “Topic” de la reunión incluye tokens:
   - `[HD child:<mongoId_del_niño>] [HD user:<mongoId_del_usuario>]`
6) La UI de planes usa el `latestReportId` para refinamientos del Plan N.1.

Fallback: si no llega el webhook o tarda, un poller (cron) lista grabaciones recientes y ejecuta la misma ingestión.

---

## Código Existente en el Repo

- Utilidades Zoom: `lib/integrations/zoom.ts`
  - `getZoomAccessToken()` (S2S OAuth: `ZOOM_ACCOUNT_ID`, `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET`).
  - `ingestZoomMeetingTranscripts({ meetingId|uuid, topic?, fallbackChildId?, fallbackUserId? })`.
    - Busca transcript (VTT/TXT), lo normaliza, analiza y guarda en `consultation_reports`.
    - Actualiza/crea `consultation_sessions` con estado y metadatos.
    - Auto‑link por tokens en el Topic: `[HD child:<id>] [HD user:<id>]`.

- Endpoints API (App Router):
  - `POST /api/integrations/zoom/webhook`
    - Handshake `endpoint.url_validation` (responde `{ plainToken, encryptedToken }` con `ZOOM_WEBHOOK_SECRET`).
    - Recibe `recording.completed` (pendiente: encolar ingestión/llamada directa a `ingestZoomMeetingTranscripts`).
  - `GET /api/integrations/zoom/poller` (cron)
    - Lista grabaciones por rango fecha para `ZOOM_USER_ID|me` y upserta sesiones; ejecuta ingest cuando procede.
    - Auth: `Authorization: Bearer ${CRON_SECRET}`.
  - `POST /api/integrations/zoom/ingest`
    - Ingesta puntual por `meetingId|uuid` opcionalmente con `childId|userId` de respaldo.
    - Auth: `Authorization: Bearer ${CRON_SECRET}`.
  - `POST /api/integrations/zoom/pull` (admin, stub)
    - Ejecución manual para pruebas; requiere sesión con `role === "admin"`.
  - `GET /api/integrations/zoom/oauth/callback`
    - Callback del flujo OAuth user‑managed. Guarda tokens en `users.integrations.zoom` o en `zoom_accounts`.
  - `GET /api/integrations/zoom/debug`
    - Estado de variables y redirección OAuth configurada.

- Parsing/Análisis:
  - `lib/transcripts/parse.ts` (VTT → texto plano).
  - `lib/transcripts/analyze.ts` (stub: genera resumen/recomendaciones; listo para Gemini/OpenAI).

Colecciones Mongo relevantes:
- `consultation_sessions` → estados de ingestión por `provider=zoom` (`recording_listed`, `recording_listed_no_transcript`, `transcript_processed`, `transcript_unlinked`).
- `consultation_reports` → transcript final + análisis, vinculado a `childId` y `userId`.

---

## Configuración en Zoom Marketplace

1) App Server-to-Server OAuth (recomendada para ingestión/transcripts)
- Crea una App S2S en https://marketplace.zoom.us/develop/create
- Scopes sugeridos (mínimos para lo usado hoy):
  - `recording:read:admin` (listar/leer grabaciones y archivos de cloud recording)
  - `meeting:read:admin` (leer reuniones, metadatos)
  - (Opcional si vas a crear reuniones vía S2S) `meeting:write:admin`
  - (Opcional) `user:read:admin` si necesitas mapear usuarios/host por correo/ID
- Copia `Account ID`, `Client ID` y `Client Secret`.

2) App OAuth (User‑Managed) — opcional
- Crea una App OAuth (User‑managed).
- Scopes mínimos típicos:
  - `meeting:write`, `meeting:read`
  - `recording:read`
  - (Opcional) `user:read`
- Configura la Redirect URL a: `https://<tu-dominio>/api/integrations/zoom/oauth/callback`
  - Local/dev: el endpoint calcula por defecto la URL en base al origen (`/api/integrations/zoom/oauth/callback`).

3) Webhooks
- En la App (S2S u OAuth), activa evento `recording.completed` apuntando a:
  - `POST https://<tu-dominio>/api/integrations/zoom/webhook`
- En la primera configuración, Zoom envía `endpoint.url_validation` con `plainToken`; nuestra ruta responde `{ plainToken, encryptedToken }` usando `ZOOM_WEBHOOK_SECRET` (HMAC‑SHA256, base64).

4) Ajustes de cuenta (muy importante)
- Activa “Cloud recording” y “Audio transcript” en Zoom (Account → Settings → Recording → Cloud Recording → Create audio transcript).
- Sin ese ajuste, Zoom no generará VTT y la ingestión no encontrará transcripts.

---

## Variables de Entorno (.env)

Obligatorias para S2S:
- `ZOOM_ACCOUNT_ID=...`
- `ZOOM_CLIENT_ID=...`
- `ZOOM_CLIENT_SECRET=...`

Webhook/seguridad:
- `ZOOM_WEBHOOK_SECRET=...`           # Para `endpoint.url_validation` y verificación de firmas
- `ZOOM_ALLOWED_ACCOUNT_IDS=acc1,acc2` # (Opcional) Lista blanca de `account_id` en webhooks
- `CRON_SECRET=...`                   # Autorización de pollers/ingest programados

Conveniencia:
- `ZOOM_USER_ID=me`                   # Por defecto para el poller; puede ser email o Zoom userId
- `ZOOM_REDIRECT_URI=https://<dominio>/api/integrations/zoom/oauth/callback`  # OAuth user-managed

MongoDB:
- `MONGODB_URI=...` y `MONGODB_DB_FINAL=...` (ya presentes en el proyecto)

---

## Ejecución de Flujos

1) Webhook (automático)
- Zoom → `POST /api/integrations/zoom/webhook`
- Acciones: valida handshake, registra evento y (pendiente de cola) llama a `ingestZoomMeetingTranscripts`.

2) Poller (cron, fallback)
```
GET /api/integrations/zoom/poller?from=2025-09-08&to=2025-09-10&page_size=50
Authorization: Bearer $CRON_SECRET
```
- Lista grabaciones de `ZOOM_USER_ID|me`; upserta en `consultation_sessions`; intenta ingestión.

3) Ingest puntual (útil para re‑procesos)
```
POST /api/integrations/zoom/ingest
Authorization: Bearer $CRON_SECRET
Content-Type: application/json
{
  "meetingId": 1234567890,           // o "uuid": "..."
  "childId": "<mongoId>",
  "userId": "<mongoId>"
}
```

4) Vincular cuenta (User‑Managed OAuth, opcional)
- Dirige al usuario a: `https://zoom.us/oauth/authorize?response_type=code&client_id=${ZOOM_CLIENT_ID}&redirect_uri=${encodeURIComponent(ZOOM_REDIRECT_URI)}&state=/dashboard/assistant?zoom=linked`
- Callback: `GET /api/integrations/zoom/oauth/callback` guarda tokens en `users.integrations.zoom`.

---

## Crear Reuniones (opcional)

Si deseas crear reuniones desde Happy Dreamers:
- Con S2S: necesitas `meeting:write:admin` y el `userId` del host dentro de tu cuenta.
- Con OAuth por usuario: usa el `access_token` del profesional.

Ejemplo (S2S) — crear reunión con grabación en la nube y Topic con auto‑link:

```ts
// lib/integrations/zoom-create.ts (ejemplo)
import { getZoomAccessToken } from "@/lib/integrations/zoom"

export async function createZoomMeetingForUser({ userId, topic, startTime, durationMin }: {
  userId: string         // email o zoomUserId dentro de la cuenta
  topic: string          // incluir [HD child:<id>] [HD user:<id>] si quieres auto‑link
  startTime: string      // ISO 8601 (e.g. 2025-09-23T18:00:00Z)
  durationMin: number
}) {
  const token = await getZoomAccessToken()
  const res = await fetch(`https://api.zoom.us/v2/users/${encodeURIComponent(userId)}/meetings`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      topic,
      type: 2, // scheduled
      start_time: startTime,
      duration: durationMin,
      settings: {
        auto_recording: "cloud",
        // Nota: la transcripción se activa en la configuración de cuenta.
        // waiting_room: true, // si aplica
        // join_before_host: false,
      },
    })
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`Zoom create meeting failed: ${res.status} ${text}`)
  }
  return await res.json() // contiene start_url (host) y join_url (invitado)
}
```

Guarda `start_url` (host) y `join_url` (invitados) en tu colección de eventos/citas.

---

## Auto‑Vinculación (Topic)

Para asociar automáticamente el transcript al niño/usuario correcto, incluye en el título de la reunión:

```
Consulta HD — [HD child:64f1e3b2a2c1f0a1b2c3d4e5] [HD user:64f1e3b2a2c1f0a1b2c3d4e6]
```

Si faltan los tokens, la ingestión guarda el texto como `transcript_unlinked` en `consultation_sessions` para conciliación posterior.

---

## Pruebas Rápidas (curl)

1) Handshake de webhook (simulado)
```
curl -X POST https://localhost:3000/api/integrations/zoom/webhook \
  -H "Content-Type: application/json" \
  -d '{ "event": "endpoint.url_validation", "payload": { "plainToken": "abc" } }'
```
Respuesta esperada: `{ plainToken: "abc", encryptedToken: "<hmac>" }` (usa `ZOOM_WEBHOOK_SECRET`).

2) Poller por rango
```
curl -X GET "http://localhost:3000/api/integrations/zoom/poller?from=2025-09-20&to=2025-09-23&page_size=30" \
  -H "Authorization: Bearer $CRON_SECRET"
```

3) Ingest puntual por meetingId
```
curl -X POST http://localhost:3000/api/integrations/zoom/ingest \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{ "meetingId": 1234567890, "childId": "<mongoId>", "userId": "<mongoId>" }'
```

---

## Seguridad y Privacidad

- Verificación de firma en webhooks: implementar verificación completa de `x-zm-signature` antes de producción (el código actual es permisivo a propósito en dev).
- Límite de scopes (principio de mínimo privilegio) y almacenamiento seguro de tokens.
- Control de acceso por roles a transcripts/reportes en la UI y API.
- Aviso a participantes sobre grabación y procesamiento de transcript.

---

## Errores Comunes y Solución

- 401 en Zoom API: credenciales S2S incorrectas o `ZOOM_ACCOUNT_ID/CLIENT_*` mal puestos.
- 403 al listar/descargar grabaciones: faltan scopes (`recording:read:admin`) o el `userId` no pertenece a la cuenta.
- 404 `meetings/{id}/recordings`: el `id/uuid` no existe o aún no hay transcript disponible.
- `no_transcript_file`: la sesión no tiene VTT/TXT todavía; esperar al webhook/poller siguiente.
- Firma del webhook inválida: revisa `ZOOM_WEBHOOK_SECRET` y la configuración de verificación en Zoom.

---

## Roadmap (siguientes pasos)

- Completar la verificación de firma de Zoom en `webhook/route.ts`.
- Conectar webhook → cola de ingestión → `ingestZoomMeetingTranscripts` (hoy el webhook registra y el poller ingiere; sirve en dev).
- Integrar LLM real (Gemini/OpenAI) con prompts médicos.
- UI: listar `consultation_sessions` y permitir conciliación de `transcript_unlinked`.

---

## Referencias

- Código:
  - `lib/integrations/zoom.ts`
  - `app/api/integrations/zoom/webhook/route.ts`
  - `app/api/integrations/zoom/poller/route.ts`
  - `app/api/integrations/zoom/ingest/route.ts`
  - `app/api/integrations/zoom/oauth/callback/route.ts`
  - `app/api/integrations/zoom/pull/route.ts`
  - `lib/transcripts/parse.ts`, `lib/transcripts/analyze.ts`

- Documentación relacionada:
  - `docs/INTEGRATIONS-TRANSCRIPTS.md` (panorama Zoom + Google)

