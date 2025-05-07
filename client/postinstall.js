/**
 * Script postinstall para asegurar que recharts está instalado correctamente
 */
const { execSync } = require('child_process');

console.log('🔄 Ejecutando script postinstall para asegurar dependencias críticas...');

try {
  console.log('📦 Reinstalando recharts de forma forzada...');
  execSync('npm install recharts@2.15.3 --force', { stdio: 'inherit' });
  console.log('✅ Recharts reinstalado correctamente');
} catch (error) {
  console.error('❌ Error al reinstalar recharts:', error);
  // No hacemos fallar el proceso para permitir que el build continúe
}

console.log('✅ Script postinstall completado'); 