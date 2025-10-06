// Script para verificar scopes y permisos de Zoom
const https = require('https');

const ZOOM_ACCOUNT_ID = 'iMhCwwJfRQOVdxotAQqMCA';
const ZOOM_CLIENT_ID = 'lkj1h8HuR8D5shi1ZuvyQ';
const ZOOM_CLIENT_SECRET = 'piJnhAyYdBTUc4L7nM6E7e1ExeaH9Rfg';

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
          resolve(json);
        } else {
          reject(new Error(`Status ${res.statusCode}: ${data}`));
        }
      });
    }).on('error', reject).end();
  });
}

async function getMeetingRecordingDetails(token, meetingId) {
  return new Promise((resolve, reject) => {
    const url = `https://api.zoom.us/v2/meetings/${meetingId}/recordings`;

    const options = {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };

    https.get(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log('\n📋 Response status:', res.statusCode);
        console.log('📋 Response headers:', JSON.stringify(res.headers, null, 2));

        if (res.statusCode === 200) {
          const json = JSON.parse(data);
          resolve(json);
        } else {
          console.log('❌ Error response:', data);
          reject(new Error(`Status ${res.statusCode}: ${data}`));
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  console.log('🔍 Verificando scopes y permisos de Zoom...\n');

  try {
    const tokenData = await getZoomAccessToken();
    console.log('✅ Token obtenido');
    console.log('Scope:', tokenData.scope || 'No scope en respuesta');
    console.log('Token type:', tokenData.token_type);
    console.log('Expires in:', tokenData.expires_in, 'segundos');

    // Probar con el meeting ID conocido
    const meetingId = '8542314621';
    console.log('\n🔍 Obteniendo detalles de la reunión:', meetingId);

    const details = await getMeetingRecordingDetails(tokenData.access_token, meetingId);

    console.log('\n📊 Detalles de la grabación:');
    console.log('UUID:', details.uuid);
    console.log('ID:', details.id);
    console.log('Topic:', details.topic);
    console.log('Total files:', details.recording_files?.length || 0);
    console.log('\n📁 Archivos disponibles:');

    if (details.recording_files) {
      details.recording_files.forEach((file, idx) => {
        console.log(`\n  Archivo ${idx + 1}:`);
        console.log('    ID:', file.id);
        console.log('    Type:', file.file_type);
        console.log('    Extension:', file.file_extension);
        console.log('    Recording Type:', file.recording_type);
        console.log('    Status:', file.status);
        console.log('    Size:', file.file_size, 'bytes');

        // Verificar si tiene download_url
        if (file.download_url) {
          console.log('    Download URL:', file.download_url.slice(0, 50) + '...');
        } else {
          console.log('    ⚠️  NO tiene download_url');
        }
      });
    }

    console.log('\n✅ Prueba completada');

  } catch (error) {
    console.error('\n❌ Error:', error.message);

    if (error.message.includes('401')) {
      console.log('\n💡 Error 401: Problemas de autenticación');
      console.log('   - Verifica las credenciales');
      console.log('   - Verifica que la app tenga los scopes correctos');
    } else if (error.message.includes('404')) {
      console.log('\n💡 Error 404: Reunión no encontrada o sin permisos');
      console.log('   - Verifica que el meeting ID sea correcto');
      console.log('   - Verifica scopes: recording:read, cloud_recording:read');
    }
  }
}

main();
