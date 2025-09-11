# Guía de Integraciones: Zoom y Google Meet/Drive

Este documento te deja todo listo para que, cuando tengas cuentas de pago de Zoom y Google Workspace con grabación/transcripción, la ingesta de transcripts hacia Happy Dreamers sea automática y habilite Plan N.1 (Refinamiento).

Última actualización: 2025-09-11

---

## Objetivo
- Automatizar el flujo: Reunión → Grabación/Transcript → Descarga → Normalización → Análisis → `consultation_reports` → Plan N.1.
- Mantener un fallback manual para pruebas y emergencias.

---

## Variables de Entorno (.env)

Configura placeholders ahora (y rellena cuando tengas las cuentas):

```
# Core
MONGODB_URI=<tu_uri_mongo>
CRON_SECRET=<token-seguro-para-cron>

# Zoom (Server-to-Server OAuth)
ZOOM_ACCOUNT_ID=
ZOOM_CLIENT_ID=
ZOOM_CLIENT_SECRET=
ZOOM_VERIFICATION_TOKEN=<token-webhook-zoom>

# Google (Service Account para Drive API)
GOOGLE_SA_CLIENT_EMAIL=
GOOGLE_SA_PRIVATE_KEY=
```

Notas:
- `GOOGLE_SA_PRIVATE_KEY` debe preservarse con saltos de línea escapados (`\n`).
- `CRON_SECRET` se usa como Bearer token en pollers/ingest manual.

---

## Endpoints a Exponer (cuando despliegues)

- Zoom
  - Webhook: `POST /api/integrations/zoom/webhook`
  - Poller (cron): `GET /api/integrations/zoom/poller`
  - Ingest manual: `POST /api/integrations/zoom/ingest`

- Google Drive
  - Webhook: `POST /api/integrations/google/drive/webhook` (opcional; puedes empezar solo con poller)
  - Poller (cron): `GET /api/integrations/google/drive/poller`

- Proceso de transcript (manual):
  - `POST /api/transcripts/process`

---

## Convención de Enlazado Automático (recomendado)

Incluye en el Título (Topic) de la reunión:

```
[HD child:<mongoId_del_niño>] [HD user:<mongoId_del_padre>]
```

Esto permite que la ingesta vincule automáticamente el transcript al niño/usuario.

---

## Configuración Zoom (cuando tengas el plan de pago)

1) Habilitar Cloud Recording + Audio Transcript
- En Zoom Web → Settings → Recording: activa Cloud Recording y Audio Transcript.

2) Crear App Server‑to‑Server OAuth (Zoom Marketplace)
- Build App → Server‑to‑Server OAuth
- Scopes mínimos: `recording:read:admin` (opcional: `meeting:read:admin` si necesitas metadatos adicionales)
- Copia `ZOOM_ACCOUNT_ID`, `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET` a `.env`

3) Webhook `recording.completed`
- Configura el webhook hacia `https://TU-DOMINIO/api/integrations/zoom/webhook`
- Enviar un header `Authorization: Bearer <ZOOM_VERIFICATION_TOKEN>` o valida el token según la consola de Zoom
- Este webhook insertará/actualizará sesiones y disparará la ingesta automática

4) Poller (fallback por cron)
- Programa un cron (cada 5–15 min) hacia:
```
GET https://TU-DOMINIO/api/integrations/zoom/poller?from=YYYY-MM-DD&to=YYYY-MM-DD&page_size=50
Authorization: Bearer <CRON_SECRET>
```
- El poller listará grabaciones/transcripts recientes y ejecutará la ingesta si falta

5) Ingest manual (útil para pruebas inmediatas)
```
curl -X POST https://TU-DOMINIO/api/integrations/zoom/ingest \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "meetingId": 123456789,
    "childId": "<mongoId_niño>",
    "userId": "<mongoId_padre>"
  }'
```
- Si omitiste los tokens `[HD ...]` en el Topic, pasa `childId` y `userId` para enlazar.

---

## Configuración Google Workspace (cuando tengas el plan de pago)

1) Edición compatible
- Revisa que tu edición de Google Workspace incluya Grabación y Transcripción en Meet (p. ej., Business Standard/Plus, Enterprise, Education T&L/Plus).

2) Habilitar Google Drive API y Service Account
- En Google Cloud Console: crea proyecto y habilita Drive API
- Crea una Service Account y descarga credenciales
- `.env`: `GOOGLE_SA_CLIENT_EMAIL` y `GOOGLE_SA_PRIVATE_KEY` (con `\n`)
- Comparte la carpeta de grabaciones/transcripts con la Service Account o usa delegación a nivel de dominio

3) Poller de Drive (recomendado al inicio)
```
GET https://TU-DOMINIO/api/integrations/google/drive/poller?folderId=<FOLDER_ID>&since=2025-09-09T00:00:00Z&limit=20
Authorization: Bearer <CRON_SECRET>
```
- Detecta documentos/transcripts recientes y los registra en `consultation_sessions`

4) Webhook de Drive (opcional)
- Configura notificaciones push de Drive que apunten a `POST /api/integrations/google/drive/webhook`
- En el header `X-Goog-Channel-Token` envía un token que compares con `GOOGLE_DRIVE_CHANNEL_TOKEN` si decides usarlo

5) Ingestión automática
- El poller/webhook registran cambios; la lógica de ingest para Google puede extenderse para descargar y procesar automáticamente el Doc/archivo de transcript
- Mientras tanto, puedes usar el endpoint manual de proceso (`/api/transcripts/process`)

---

## Flujo de Datos (E2E)

- Zoom: Webhook/poller → descarga `download_url` del transcript (VTT/TXT) → normaliza → analiza → inserta en `consultation_reports` → Plan N.1 disponible.
- Google: Poller/Drive → detecta archivo → (descarga/transcribe si aplica) → normaliza → analiza → inserta en `consultation_reports` → Plan N.1 disponible.

---

## Pruebas Hoy (sin cuentas de pago)

1) Enviar transcript manual a proceso
```
curl -X POST https://TU-DOMINIO/api/transcripts/process \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "zoom",
    "childId": "<mongoId_niño>",
    "userId": "<mongoId_padre>",
    "resource": { "text": "Paciente presenta despertares nocturnos..." }
  }'
```

2) Subir audio para transcripción (grabación local)
- `POST /api/transcript` con FormData `audio` (WAV/MP3/WebM/OGG)
- Toma el texto resultante y envíalo a `/api/transcripts/process`

3) Generar Plan N.1 (Refinamiento)
- Ir a `/dashboard/planes` (admin) o `/dashboard/consultas` → tab “Plan”
- La validación usa `latestReportId` automáticamente tras crear el `consultation_reports`

---

## Operación y Monitoreo

- Programa CRON para pollers (Zoom/Drive) con Bearer `CRON_SECRET`
- Revisa logs de ingest (webhook/poller) tras primeras sesiones
- En `consultation_sessions` puedes ver estados: `recording_listed`, `recording_listed_no_transcript`, `transcript_processed`, `transcript_unlinked`

---

## Seguridad y Privacidad

- Usa secretos fuertes (`CRON_SECRET`, `ZOOM_VERIFICATION_TOKEN`)
- Limita scopes de OAuth al mínimo necesario
- Control de acceso por roles a transcripts/reportes
- Aviso a participantes sobre grabación/transcripción en las sesiones
- Define retención y borrado para datos sensibles

---

## Troubleshooting

- El transcript tarda: es normal que Zoom tarde minutos; el poller lo retomará
- 401/403 en pollers: revisa `CRON_SECRET` y headers
- Descarga Zoom falla: revisa credenciales S2S y que el recording tenga `download_url` del transcript
- Texto vacío tras normalizar VTT: prueba enviar `resource.text` directo a `/api/transcripts/process`
- No se enlaza a niño/usuario: añade tokens `[HD child:...] [HD user:...]` en el Topic o usa `POST /api/integrations/zoom/ingest` con `childId/userId`

---

## Referencias de Código

- Zoom
  - Webhook: `app/api/integrations/zoom/webhook/route.ts`
  - Poller: `app/api/integrations/zoom/poller/route.ts`
  - Ingest manual: `app/api/integrations/zoom/ingest/route.ts`
  - Utilidades: `lib/integrations/zoom.ts`

- Google Drive
  - Webhook: `app/api/integrations/google/drive/webhook/route.ts`
  - Poller: `app/api/integrations/google/drive/poller/route.ts`

- Transcripts y Planes
  - Proceso: `app/api/transcripts/process/route.ts`
  - Validación/generación de planes: `app/api/consultas/plans/route.ts`

