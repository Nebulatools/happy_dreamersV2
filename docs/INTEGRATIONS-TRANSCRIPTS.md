# Integraciones de Transcripción (Zoom | Google Meet + Drive + Gemini)

Este documento explica qué se implementó, para qué sirve y cómo probar los flujos de transcripción y análisis de sesiones por dos proveedores: Zoom y Google (Meet + Drive + Gemini). Incluye endpoints, variables de entorno y próximos pasos.

Última actualización: 2025-09-11

---

## Objetivo
Habilitar la ingesta de sesiones (grabaciones/transcripts), su normalización y un análisis automático que alimente los reportes y planes. Se prueban en paralelo dos rutas:
- Zoom: Webhooks de grabación/transcripción → descarga de transcript → análisis → guardado.
- Google: Google Meet + Google Drive (transcripts/MP4) → ingestión por webhook o polling → análisis con Gemini → guardado.

---

## Cambios Recientes (qué se hizo)
- Endpoints (borrador/sketch) para recibir eventos de ambos proveedores y procesar transcripciones:
  - `app/api/integrations/zoom/webhook/route.ts`: Webhook de Zoom (recording.completed) → crea stub de sesión.
  - `app/api/integrations/google/drive/webhook/route.ts`: Webhook de Drive (push notifications) → crea stub de cambio.
  - `app/api/transcripts/process/route.ts`: Procesa un transcript dado un `provider` y un recurso (texto, VTT, etc.), analiza y guarda reporte.
- Utilidades de parsing/análisis:
  - `lib/transcripts/parse.ts`: Normaliza VTT/Doc a texto plano.
  - `lib/transcripts/analyze.ts`: Análisis “stub” con estructura lista para integrar Gemini/OpenAI.
- Integración futura con planes: `app/api/consultas/plans/route.ts` ya consume `consultation_reports`; los nuevos reportes podrán ser fuente de refinamientos.

---

## ¿Para qué sirve?
- Centraliza la lógica para transformar sesiones reales (Zoom o Meet) en transcripciones legibles.
- Dispara un análisis automático (resumen + recomendaciones) que se almacena en MongoDB (colección `consultation_reports`).
- Permite comparar dos proveedores y decidir cuál se adapta mejor (calidad de transcript, latencia, permisos).

---

## Endpoints y Uso

### 1) Zoom Webhook (recording/transcription)
- Ruta: `POST /api/integrations/zoom/webhook`
- Auth: header `Authorization: Bearer ${ZOOM_VERIFICATION_TOKEN}` (básico para pruebas).
- Evento esperado: `recording.completed`
- Comportamiento: crea un registro en `consultation_sessions` con `provider=zoom` y estado `awaiting_recording`.
- Ejemplo (mock):
```
curl -X POST http://localhost:3000/api/integrations/zoom/webhook \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ZOOM_VERIFICATION_TOKEN" \
  -d '{
    "event": "recording.completed",
    "payload": { "object": { "id": "123456789", "uuid": "abc-uuid", "topic": "Consulta", "start_time": "2025-09-10T18:00:00Z" } }
  }'
```

### 2) Google Drive Webhook (push notifications)
- Ruta: `POST /api/integrations/google/drive/webhook`
- Auth: header `X-Goog-Channel-Token: ${GOOGLE_DRIVE_CHANNEL_TOKEN}`
- Comportamiento: registra `resourceId`/`resourceState` en `consultation_sessions` con `provider=google`.
- Ejemplo (mock):
```
curl -X POST http://localhost:3000/api/integrations/google/drive/webhook \
  -H "X-Goog-Channel-Token: $GOOGLE_DRIVE_CHANNEL_TOKEN" \
  -H "X-Goog-Resource-State: change" \
  -H "X-Goog-Resource-Id: some-drive-resource-id"
```

### 3) Procesamiento de Transcript (normaliza + analiza + guarda)
- Ruta: `POST /api/transcripts/process`
- Body:
```
{
  "provider": "zoom" | "google",
  "childId": "<mongoId>",
  "userId": "<mongoId>",
  "resource": {
    "vtt": "...contenido VTT...",
    "srt": "...contenido SRT...",
    "docText": "...texto exportado de Google Doc...",
    "text": "...texto plano..."
  }
}
```

### 4) Google Drive Poller (fallback por cron)
- Ruta: `GET /api/integrations/google/drive/poller`
- Auth: header `Authorization: Bearer ${CRON_SECRET}` (igual que el scheduler de notificaciones).
- Parámetros (query):
  - `folderId` (opcional): carpeta en la que buscar.
  - `since` (opcional): fecha ISO desde la cual buscar (default: 24h atrás).
  - `limit` (opcional): máximo de archivos a revisar (1–100, default 25).
- Requisitos de entorno:
  - `GOOGLE_SA_CLIENT_EMAIL`, `GOOGLE_SA_PRIVATE_KEY` (Service Account con acceso de lectura a Drive).
  - `CRON_SECRET` para autorizar el llamado.
- Comportamiento: lista archivos recientes (Google Doc transcripts o MP4) y registra/actualiza entradas en `consultation_sessions` con `status=drive_file_detected`.
- Ejemplo (mock):
```
curl -X GET "http://localhost:3000/api/integrations/google/drive/poller?folderId=<FOLDER>&since=2025-09-09T00:00:00Z&limit=20" \
  -H "Authorization: Bearer $CRON_SECRET"
```
- Comportamiento: normaliza el texto (VTT/SRT/Doc → texto plano), llama análisis (stub Gemini/OpenAI) y guarda en `consultation_reports`.
- Respuesta: `{ success: true, reportId: "..." }`
- Ejemplos (mock):
```
# Caso Zoom con VTT
curl -X POST http://localhost:3000/api/transcripts/process \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "zoom",
    "childId": "64f1e3b2a2c1f0a1b2c3d4e5",
    "userId": "64f1e3b2a2c1f0a1b2c3d4e6",
    "resource": { "vtt": "WEBVTT\n\n00:00:00.000 --> 00:00:02.000\nHola..." }
  }'

# Caso Google con texto de Doc
curl -X POST http://localhost:3000/api/transcripts/process \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "google",
    "childId": "64f1e3b2a2c1f0a1b2c3d4e5",
    "userId": "64f1e3b2a2c1f0a1b2c3d4e6",
    "resource": { "docText": "Paciente presenta..." }
  }'
```

---

## Variables de Entorno
- `ZOOM_VERIFICATION_TOKEN`: token para validar webhooks de Zoom (básico para pruebas).
- `GOOGLE_DRIVE_CHANNEL_TOKEN`: token de canal para validar webhooks de Drive.
- (Próximas): credenciales OAuth/Service Account para Zoom/Google cuando se integre descarga real.

---

## Cómo Probar (rápido)
1) Simular webhook de Zoom y Drive con `curl` (ver ejemplos) y verificar inserciones en Mongo (`consultation_sessions`).
2) Enviar al endpoint de proceso con un VTT/Doc de ejemplo y comprobar que se crea un `consultation_reports` con `analysis` y `recommendations`.
3) Ver en los planes (ruta `app/api/consultas/plans/route.ts`) cómo `consultation_reports` sirven para planes N.1.

---

## Próximos Pasos (TODO)
- Zoom:
  - OAuth app + scopes (recording/transcription), descargar VTT/SRT/MP4 vía API.
  - Si no hay transcript: STT (Whisper/Google Speech-to-Text) contra audio.
- Google:
  - Watch de carpeta de grabaciones; descargar Google Doc “Transcript” o MP4.
  - Fallback cron: endpoint de polling para recientes (Drive `files.list`).
- Análisis (LLM real): reemplazar stub por Gemini (`@google/generative-ai`) u OpenAI con prompts médicos.
- Seguridad: firmar/verificar mensajes (headers de Zoom), cifrado en reposo, retención de datos.
- UI: listar sesiones/transcripts por niño; enlace para ver el reporte analizado.

---

## Notas de Seguridad y Privacidad
- Aviso de grabación/transcripción a participantes.
- Scopes mínimos de OAuth; tokens almacenados de forma segura.
- Control de acceso por rol a transcripts/reportes.
- Política de retención/borrado (por definir) para datos sensibles.

---

## Referencias de Código
- Webhooks:
  - `app/api/integrations/zoom/webhook/route.ts`
  - `app/api/integrations/google/drive/webhook/route.ts`
- Proceso de transcript: `app/api/transcripts/process/route.ts`
- Parse/Analyze: `lib/transcripts/parse.ts`, `lib/transcripts/analyze.ts`
- Planes: `app/api/consultas/plans/route.ts`
