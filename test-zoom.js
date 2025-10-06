// Script de prueba para verificar credenciales de Zoom y grabaciones disponibles
const https = require('https');

// Credenciales de Zoom desde .env
const ZOOM_ACCOUNT_ID = 'iMhCwwJfRQOVdxotAQqMCA';
const ZOOM_CLIENT_ID = 'lkj1h8HuR8D5shi1ZuvyQ';
const ZOOM_CLIENT_SECRET = 'piJnhAyYdBTUc4L7nM6E7e1ExeaH9Rfg';
const ZOOM_USER_ID = 'me';

// Función para obtener el token de acceso
async function getZoomAccessToken() {
  return new Promise((resolve, reject) => {
    const basic = Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString('base64');
    const url = `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${encodeURIComponent(ZOOM_ACCOUNT_ID)}`;

    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    };

    https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          const json = JSON.parse(data);
          console.log('✅ Token obtenido exitosamente');
          resolve(json.access_token);
        } else {
          console.log('❌ Error al obtener token:', res.statusCode);
          console.log('Response:', data);
          reject(new Error(`Status ${res.statusCode}: ${data}`));
        }
      });
    }).on('error', reject).end();
  });
}

// Función para obtener las grabaciones
async function getRecordings(token) {
  return new Promise((resolve, reject) => {
    const now = new Date();
    const to = now.toISOString().slice(0, 10);
    const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const url = `https://api.zoom.us/v2/users/${ZOOM_USER_ID}/recordings?from=${from}&to=${to}&page_size=30`;

    const options = {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };

    https.get(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          const json = JSON.parse(data);
          console.log('\n📊 Grabaciones encontradas:');
          console.log('Total de reuniones:', json.meetings?.length || 0);

          if (json.meetings && json.meetings.length > 0) {
            json.meetings.forEach((meeting, idx) => {
              console.log(`\n--- Reunión ${idx + 1} ---`);
              console.log('ID:', meeting.id);
              console.log('UUID:', meeting.uuid);
              console.log('Tema:', meeting.topic);
              console.log('Fecha:', meeting.start_time);
              console.log('Archivos de grabación:', meeting.recording_files?.length || 0);

              if (meeting.recording_files) {
                meeting.recording_files.forEach((file, fidx) => {
                  const type = file.file_type || file.recording_type || 'unknown';
                  const ext = file.file_extension || '';
                  console.log(`  Archivo ${fidx + 1}: ${type}.${ext} (${file.status})`);
                });
              }
            });
          } else {
            console.log('⚠️  No hay grabaciones en los últimos 30 días');
          }

          resolve(json);
        } else {
          console.log('❌ Error al obtener grabaciones:', res.statusCode);
          console.log('Response:', data);
          reject(new Error(`Status ${res.statusCode}: ${data}`));
        }
      });
    }).on('error', reject);
  });
}

// Ejecutar pruebas
async function main() {
  console.log('🔍 Probando credenciales de Zoom...\n');
  console.log('Account ID:', ZOOM_ACCOUNT_ID);
  console.log('Client ID:', ZOOM_CLIENT_ID);
  console.log('User ID:', ZOOM_USER_ID);
  console.log('\n---\n');

  try {
    const token = await getZoomAccessToken();
    console.log('Token (primeros 20 chars):', token.slice(0, 20) + '...');

    console.log('\n🔍 Buscando grabaciones...');
    await getRecordings(token);

    console.log('\n✅ Prueba completada exitosamente');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();
