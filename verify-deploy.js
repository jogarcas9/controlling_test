/**
 * Script para verificar que la estructura del proyecto es correcta antes del despliegue
 * Ejecutar con: node verify-deploy.js
 */

const fs = require('fs');
const path = require('path');

// Archivos y carpetas críticos que deben existir
const requiredFiles = [
  'server.js',
  'vercel.json',
  'package.json',
  'config/index.js',
  'config/mongodb.js',
  'middleware/auth.js',
  'routes/api/auth.js',
  'models/User.js'
];

// Verificar si todos los archivos existen
console.log('🔍 Verificando estructura del proyecto para despliegue en Vercel...\n');

let allFilesExist = true;
let missingFiles = [];

requiredFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file} - Encontrado`);
  } else {
    console.log(`❌ ${file} - FALTA`);
    allFilesExist = false;
    missingFiles.push(file);
  }
});

// Verificar package.json
console.log('\n📦 Verificando package.json...');
try {
  const packageJson = require('./package.json');
  
  // Verificar main
  if (packageJson.main !== 'server.js') {
    console.log(`⚠️ El campo 'main' en package.json no apunta a server.js (actual: ${packageJson.main})`);
  } else {
    console.log('✅ Campo "main" correcto en package.json');
  }
  
  // Verificar scripts
  if (!packageJson.scripts || !packageJson.scripts.start || !packageJson.scripts.start.includes('server.js')) {
    console.log('⚠️ No se encontró un script "start" que ejecute server.js');
  } else {
    console.log('✅ Script "start" correcto en package.json');
  }
  
  // Verificar dependencias críticas
  const criticalDeps = ['express', 'mongoose', 'socket.io', 'cors', 'jsonwebtoken'];
  const missingDeps = criticalDeps.filter(dep => !packageJson.dependencies || !packageJson.dependencies[dep]);
  
  if (missingDeps.length > 0) {
    console.log(`⚠️ Faltan dependencias críticas: ${missingDeps.join(', ')}`);
  } else {
    console.log('✅ Todas las dependencias críticas están presentes');
  }
  
} catch (error) {
  console.log('❌ Error al verificar package.json:', error.message);
  allFilesExist = false;
}

// Verificar vercel.json
console.log('\n🔧 Verificando vercel.json...');
try {
  const vercelJson = require('./vercel.json');
  
  // Verificar builds
  if (!vercelJson.builds || !vercelJson.builds.length || !vercelJson.builds.some(b => b.src === 'server.js')) {
    console.log('⚠️ No se encontró configuración de builds para server.js en vercel.json');
  } else {
    console.log('✅ Configuración de builds correcta');
  }
  
  // Verificar routes
  if (!vercelJson.routes || !vercelJson.routes.length) {
    console.log('⚠️ No se encontraron rutas configuradas en vercel.json');
  } else {
    console.log('✅ Rutas configuradas en vercel.json');
  }
  
  // Verificar environment variables
  if (!vercelJson.env || !vercelJson.env.MONGODB_URI || !vercelJson.env.JWT_SECRET) {
    console.log('⚠️ Faltan variables de entorno críticas en vercel.json');
  } else {
    console.log('✅ Variables de entorno configuradas');
  }
  
} catch (error) {
  console.log('❌ Error al verificar vercel.json:', error.message);
  allFilesExist = false;
}

// Resumen final
console.log('\n📋 RESUMEN DE LA VERIFICACIÓN:');
if (allFilesExist) {
  console.log('✅ Todos los archivos críticos están presentes. La estructura es válida para despliegue.');
} else {
  console.log('❌ ADVERTENCIA: Faltan archivos críticos. El despliegue podría fallar.');
  console.log('   Archivos faltantes:');
  missingFiles.forEach(file => console.log(`   - ${file}`));
}

// Advertencia de que esto no garantiza que el despliegue funcione
console.log('\n⚠️ NOTA: Esta verificación no garantiza que el despliegue funcione correctamente.');
console.log('   Asegúrate de verificar la configuración específica de cada archivo.');

// Sugerencias para resolver problemas comunes
console.log('\n🔧 PASOS PARA RESOLVER PROBLEMAS COMUNES DE DESPLIEGUE:');
console.log('1. Asegúrate de que el campo "main" en package.json apunte a server.js');
console.log('2. En vercel.json, configura correctamente la sección "builds" para server.js');
console.log('3. En vercel.json, configura las rutas para manejar /api/* y /* correctamente');
console.log('4. Asegúrate de que las variables de entorno estén configuradas en vercel.json o en el dashboard de Vercel');
console.log('5. Verifica que server.js exporte la aplicación de manera adecuada para Vercel serverless functions'); 