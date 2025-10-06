# Configuración de Zoom para Transcripts

## Estado actual ✅
- ✅ Credenciales de Zoom configuradas correctamente
- ✅ Token de acceso funciona
- ✅ Se detectó 1 reunión grabada (2025-10-01)
- ❌ No hay archivos de transcript disponibles (solo MP4 y M4A)

## Problema
La reunión grabada no tiene archivos de transcript generados. Zoom solo generó:
- MP4 (video)
- M4A (audio)

Para que la aplicación pueda mostrar transcripts, necesitas archivos VTT o TXT.

## Solución: Habilitar Audio Transcript en Zoom

### Opción 1: Configuración de cuenta (Recomendado)
1. Ir a https://zoom.us/profile/setting
2. En la cuenta de Mariana (mariana@...)
3. Navegar a **Recordings** (Grabaciones)
4. Buscar la opción **"Audio transcript"** o **"Advanced cloud recording settings"**
5. Activar:
   - ✅ **Audio transcript** (genera archivo VTT)
   - ✅ **Save closed captions** (guardar subtítulos)
   - ✅ **Auto-transcription** (transcripción automática)

### Opción 2: Durante la reunión
1. Al iniciar grabación, hacer clic en **"More"** > **"Record to the Cloud"**
2. Activar **"Transcription"** en el menú de grabación
3. La transcripción se generará automáticamente

### Verificar configuración actual
Pasos para verificar si la transcripción está habilitada:
1. Login en https://zoom.us con la cuenta de Mariana
2. Ir a **Settings** > **Recording**
3. Verificar estas opciones:
   - **Cloud recording**: debe estar ON
   - **Audio transcript**: debe estar ON
   - **Advanced cloud recording settings**: expandir y verificar

## Alternativa: Procesar grabaciones existentes

Si ya tienes grabaciones sin transcript, puedes:
1. Usar servicios externos como:
   - Whisper de OpenAI (ya tienes API key configurada)
   - Google Cloud Speech-to-Text
   - Amazon Transcribe

2. Implementar endpoint para procesar MP4/M4A y generar transcripts:
   ```
   POST /api/integrations/zoom/transcripts/generate
   {
     "meetingId": "8542314621",
     "fileId": "..." // ID del archivo de audio
   }
   ```

## Próximos pasos
1. ☑️ Habilitar Audio Transcript en la cuenta de Zoom
2. ☑️ Hacer una nueva reunión de prueba con transcription activada
3. ☑️ Verificar que el archivo VTT se genera automáticamente
4. ☑️ Volver a ejecutar `node test-zoom.js` para verificar

## Verificación rápida
Después de habilitar transcripts, ejecuta:
```bash
node test-zoom.js
```

Deberías ver:
```
Archivos de grabación: 3 (o más)
  Archivo 1: MP4.MP4 (completed)
  Archivo 2: M4A.M4A (completed)
  Archivo 3: TRANSCRIPT.VTT (completed)  ← Este es el que necesitamos
```
