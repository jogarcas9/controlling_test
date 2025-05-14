/**
 * Script para limpiar archivos temporales y optimizar el proyecto
 */

const fs = require('fs');
const path = require('path');
const rimraf = require('rimraf');
const { promisify } = require('util');
const glob = promisify(require('glob'));
const exec = promisify(require('child_process').exec);

const rimrafPromise = promisify(rimraf);

// Directorios y archivos a limpiar
const PATHS_TO_CLEAN = [
  './.cache',
  './build',
  './node_modules/.cache',
  './coverage',
  './build-stats.json'
];

// Extensiones de archivo temporales a eliminar (recursivamente)
const TEMP_EXTENSIONS = [
  '**/*.log',
  '**/*.tmp',
  '**/.DS_Store',
  '**/Thumbs.db'
];

async function cleanProject() {
  console.log('🧹 Limpiando el proyecto...');
  
  // 1. Limpiar directorios principales
  try {
    for (const pathToClean of PATHS_TO_CLEAN) {
      const fullPath = path.resolve(__dirname, pathToClean);
      if (fs.existsSync(fullPath)) {
        await rimrafPromise(fullPath);
        console.log(`✅ Eliminado: ${pathToClean}`);
      }
    }
  } catch (error) {
    console.error('❌ Error al limpiar directorios:', error);
  }
  
  // 2. Eliminar archivos temporales
  try {
    for (const pattern of TEMP_EXTENSIONS) {
      const files = await glob(pattern, { cwd: __dirname, dot: true });
      for (const file of files) {
        fs.unlinkSync(path.resolve(__dirname, file));
        console.log(`✅ Eliminado archivo temporal: ${file}`);
      }
    }
  } catch (error) {
    console.error('❌ Error al eliminar archivos temporales:', error);
  }
  
  // 3. Limpiar cache npm
  try {
    console.log('🧹 Limpiando caché de npm...');
    await exec('npm cache clean --force');
    console.log('✅ Caché de npm limpiada');
  } catch (error) {
    console.error('❌ Error al limpiar caché de npm:', error);
  }
  
  console.log('✨ Limpieza completada');
}

// Ejecutar limpieza
cleanProject().then(() => {
  console.log('🚀 Proyecto listo para desarrollo optimizado');
}).catch(error => {
  console.error('❌ Error durante la limpieza:', error);
}); 