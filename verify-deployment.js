/**
 * Script para verificar el estado del despliegue de Controling
 * 
 * Uso: node verify-deployment.js
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

// Configuración
const FRONTEND_URL = 'https://controlling-pwa-frontend.vercel.app';
const BACKEND_URL = 'https://controling-backend.vercel.app';

// Recursos a verificar
const resourcesToCheck = [
  // Frontend
  `${FRONTEND_URL}/`,
  `${FRONTEND_URL}/manifest.json`,
  `${FRONTEND_URL}/service-worker.js`,
  `${FRONTEND_URL}/images/logo192.png`,
  `${FRONTEND_URL}/images/logo512.png`,
  `${FRONTEND_URL}/favicon.ico`,
  
  // Backend
  `${BACKEND_URL}/api/health`,
];

// Función para hacer una petición HTTP/HTTPS
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const requestOptions = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Controling-Deployment-Verifier/1.0',
      },
    };

    const reqHandler = (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          url,
          status: res.statusCode,
          headers: res.headers,
          data: data.length < 200 ? data : data.substring(0, 200) + '... (truncated)'
        });
      });
    };

    const req = parsedUrl.protocol === 'https:' 
      ? https.request(requestOptions, reqHandler) 
      : http.request(requestOptions, reqHandler);
    
    req.on('error', (error) => {
      reject({
        url,
        error: error.message
      });
    });
    
    // Set timeout to 10 seconds
    req.setTimeout(10000, () => {
      req.abort();
      reject({
        url,
        error: 'Request timeout (10s)'
      });
    });
    
    req.end();
  });
}

// Función principal
async function verifyDeployment() {
  console.log(`\n📊 Verificando despliegue de Controling...`);
  console.log(`🌐 Frontend: ${FRONTEND_URL}`);
  console.log(`🌐 Backend: ${BACKEND_URL}`);
  console.log('--------------------------------------------\n');
  
  for (const resource of resourcesToCheck) {
    try {
      console.log(`⏳ Verificando: ${resource}`);
      const result = await makeRequest(resource);
      
      if (result.status >= 200 && result.status < 300) {
        console.log(`✅ [${result.status}] ${resource}`);
        
        // Para health check mostrar más información
        if (resource.includes('/api/health')) {
          try {
            const healthData = JSON.parse(result.data);
            console.log(`   - Estado: ${healthData.status}`);
            console.log(`   - Entorno: ${healthData.environment}`);
            console.log(`   - Base de datos: ${healthData.database}`);
            console.log(`   - Socket.IO: ${healthData.socketio}`);
          } catch (e) {
            console.log(`   - No se pudo parsear la respuesta JSON`);
          }
        }
      } else {
        console.log(`❌ [${result.status}] ${resource}`);
        console.log(`   Respuesta: ${result.data}`);
      }
    } catch (error) {
      console.log(`❌ Error al verificar ${resource}: ${error.error || 'Error desconocido'}`);
    }
    
    console.log(''); // Línea en blanco para separar recursos
  }
  
  console.log('\n--------------------------------------------');
  console.log('✨ Verificación completa');
  console.log('--------------------------------------------');
}

// Ejecutar verificación
verifyDeployment().catch(err => {
  console.error('Error durante la verificación:', err);
}); 