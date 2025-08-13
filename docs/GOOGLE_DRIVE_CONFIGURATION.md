# 🔑 CONFIGURACIÓN GOOGLE DRIVE API - GUÍA PASO A PASO

## 🎯 OBJETIVO
Configurar Google Drive API para sincronización automática de documentos en Happy Dreamers RAG system.

## 📋 PROCESO COMPLETO

### **PASO 1: CREAR PROYECTO EN GOOGLE CLOUD**

1. **Ir a Google Cloud Console:**
   - URL: https://console.cloud.google.com/
   - Asegúrate de estar logado con la cuenta correcta

2. **Crear nuevo proyecto:**
   - Hacer clic en el **selector de proyecto** (parte superior)
   - **"NEW PROJECT"**
   - **Project name**: `Happy Dreamers Dev` (o el que prefieras)
   - **Project ID**: Se generará automáticamente (ej: `happy-dreamers-dev-123456`)
   - **Location**: Tu organización o "No organization"
   - Hacer clic en **"CREATE"**

3. **Anotar el Project ID:**
   - Una vez creado, copiar el **Project ID exacto**
   - Lo necesitarás para el archivo `.env`

### **PASO 2: HABILITAR GOOGLE DRIVE API**

1. **Asegúrate de estar en el proyecto correcto** (verificar en la parte superior)

2. **Ir a APIs & Services:**
   - Menú lateral → **"APIs & Services"** → **"Library"**

3. **Buscar y habilitar Google Drive API:**
   - Buscar: `Google Drive API`
   - Hacer clic en el resultado
   - Hacer clic en **"ENABLE"**
   - Esperar a que se habilite (1-2 minutos)

### **PASO 3: CREAR SERVICE ACCOUNT**

1. **Ir a Credentials:**
   - **APIs & Services** → **"Credentials"**

2. **Crear Service Account:**
   - Hacer clic en **"+ CREATE CREDENTIALS"**
   - Seleccionar **"Service account"**

3. **Configurar Service Account:**
   - **Service account name**: `happy-dreamers-drive`
   - **Service account ID**: Se completará automáticamente
   - **Description**: `Service account para sincronización automática de documentos con Google Drive`
   - Hacer clic en **"CREATE AND CONTINUE"**

4. **Asignar rol (Opcional):**
   - Puedes saltarte este paso haciendo clic en **"CONTINUE"**
   - O asignar rol: **"Viewer"** (mínimo necesario)

5. **Grant users access (Opcional):**
   - Hacer clic en **"DONE"** (saltarse este paso)

### **PASO 4: GENERAR CLAVES JSON**

1. **Ir a la service account creada:**
   - En la lista de service accounts, hacer clic en `happy-dreamers-drive@...`

2. **Crear clave:**
   - Ir a la pestaña **"Keys"**
   - Hacer clic en **"ADD KEY"** → **"Create new key"**
   - Seleccionar formato **"JSON"**
   - Hacer clic en **"CREATE"**

3. **Descargar archivo JSON:**
   - Se descargará automáticamente un archivo JSON
   - **¡IMPORTANTE!** Guárdalo en lugar seguro
   - **NUNCA** subas este archivo a git o repositorios públicos

### **PASO 5: CONFIGURAR VARIABLES DE ENTORNO**

1. **Abrir el archivo JSON descargado** con un editor de texto

2. **El archivo se ve así:**
```json
{
  "type": "service_account",
  "project_id": "happy-dreamers-dev-123456",
  "private_key_id": "a1b2c3d4e5f6...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n",
  "client_email": "happy-dreamers-drive@happy-dreamers-dev-123456.iam.gserviceaccount.com",
  "client_id": "123456789012345678901",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs/happy-dreamers-drive%40happy-dreamers-dev-123456.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
}
```

3. **Mapear valores al archivo .env:**
```bash
# Google Drive API para sincronización automática de documentos
GOOGLE_DRIVE_TYPE=service_account
GOOGLE_DRIVE_PROJECT_ID=happy-dreamers-dev-123456
GOOGLE_DRIVE_PRIVATE_KEY_ID=a1b2c3d4e5f6...
GOOGLE_DRIVE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
GOOGLE_DRIVE_CLIENT_EMAIL=happy-dreamers-drive@happy-dreamers-dev-123456.iam.gserviceaccount.com
GOOGLE_DRIVE_CLIENT_ID=123456789012345678901
GOOGLE_DRIVE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
GOOGLE_DRIVE_TOKEN_URI=https://oauth2.googleapis.com/token
GOOGLE_DRIVE_AUTH_PROVIDER_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
GOOGLE_DRIVE_CLIENT_CERT_URL=https://www.googleapis.com/oauth2/v1/certs/happy-dreamers-drive%40happy-dreamers-dev-123456.iam.gserviceaccount.com
GOOGLE_DRIVE_UNIVERSE_DOMAIN=googleapis.com
```

### **PASO 6: CREAR Y CONFIGURAR CARPETA EN GOOGLE DRIVE**

1. **Crear carpeta en Google Drive:**
   - Ir a https://drive.google.com/
   - Hacer clic derecho → **"Nueva carpeta"**
   - Nombre: `Happy Dreamers - Knowledge Base`
   - Crear la carpeta

2. **Obtener ID de la carpeta:**
   - Abrir la carpeta creada
   - Copiar el ID de la URL:
   ```
   https://drive.google.com/drive/folders/1ABC-defGHI_jklMNO
   ID de carpeta: 1ABC-defGHI_jklMNO
   ```

3. **Compartir carpeta con Service Account:**
   - Hacer clic derecho en la carpeta → **"Compartir"**
   - Agregar el email: `GOOGLE_DRIVE_CLIENT_EMAIL` del .env
   - Permisos: **"Editor"** (para poder leer los archivos)
   - Hacer clic en **"Enviar"**

4. **Configurar ID en .env:**
```bash
# ID de la carpeta de Google Drive que contiene los documentos para el RAG
GOOGLE_DRIVE_FOLDER_ID=1ABC-defGHI_jklMNO
```

### **PASO 7: VERIFICAR CONFIGURACIÓN**

1. **Verificar que todas las variables estén completas en .env:**
```bash
GOOGLE_DRIVE_TYPE=service_account
GOOGLE_DRIVE_PROJECT_ID=happy-dreamers-dev-123456
GOOGLE_DRIVE_PRIVATE_KEY_ID=a1b2c3d4e5f6...
GOOGLE_DRIVE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
GOOGLE_DRIVE_CLIENT_EMAIL=happy-dreamers-drive@...
GOOGLE_DRIVE_CLIENT_ID=123456789012345678901
GOOGLE_DRIVE_CLIENT_CERT_URL=https://www.googleapis.com/oauth2/v1/certs/...
GOOGLE_DRIVE_FOLDER_ID=1ABC-defGHI_jklMNO
GOOGLE_DRIVE_SYNC_ENABLED=true
```

2. **Reiniciar servidor de desarrollo:**
```bash
npm run dev
# o
yarn dev
```

3. **Probar conexión:**
   - Ir al panel de admin
   - Buscar sección de Google Drive
   - Hacer clic en "Test Connection"
   - Debe mostrar ✅ "Conexión exitosa"

## ⚠️ PUNTOS CRÍTICOS

### **🔒 SEGURIDAD:**
- **NUNCA** commitees el archivo JSON original al repositorio
- **NUNCA** compartas las claves privadas
- **Usa variables de entorno** para todas las credenciales
- **Rota las claves** periódicamente en producción

### **⚡ FORMATO IMPORTANTE:**
- **La `PRIVATE_KEY` DEBE estar entre comillas dobles**
- **Mantener los `\n` en la clave privada**
- **No agregar espacios extra** al copiar/pegar

### **🎯 PERMISOS MÍNIMOS:**
- **Service Account**: Solo necesita acceso a la carpeta específica
- **Carpeta Drive**: Permisos de "Editor" para la service account
- **APIs**: Solo Google Drive API habilitada

## 🧪 TESTING

### **Comandos de verificación:**

1. **Test de conexión básica:**
```bash
curl -X POST http://localhost:3000/api/rag/sync-drive \
  -H "Content-Type: application/json" \
  -d '{"testConnection": true}'
```

2. **Estado de sincronización:**
```bash
curl http://localhost:3000/api/rag/sync-drive
```

3. **Sincronización manual:**
```bash
curl -X POST http://localhost:3000/api/rag/sync-drive \
  -H "Content-Type: application/json" \
  -d '{"fullSync": true}'
```

## 🔧 TROUBLESHOOTING

### **Error: "Access denied"**
- ✅ Verifica que la carpeta esté compartida con el `client_email`
- ✅ Confirma permisos de "Editor" en la carpeta

### **Error: "Invalid credentials"**
- ✅ Revisa que todas las variables de .env estén completas
- ✅ Confirma formato correcto del `private_key` (con comillas y \n)

### **Error: "Folder not found"**
- ✅ Verifica que el `GOOGLE_DRIVE_FOLDER_ID` sea correcto
- ✅ Confirma que la carpeta exista y sea accesible

### **Error: "API not enabled"**
- ✅ Asegúrate de haber habilitado Google Drive API en el proyecto correcto
- ✅ Espera unos minutos para que se propague el cambio

## ✅ CHECKLIST FINAL

- [ ] Proyecto creado en Google Cloud
- [ ] Google Drive API habilitada
- [ ] Service Account creada
- [ ] Archivo JSON descargado y seguro
- [ ] Variables de entorno configuradas correctamente
- [ ] Carpeta en Google Drive creada
- [ ] Carpeta compartida con service account
- [ ] Test de conexión exitoso
- [ ] Sincronización funcionando

¡Una vez completado todo este proceso, tendrás Google Drive API completamente configurado y funcionando! 🎉