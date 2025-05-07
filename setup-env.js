/**
 * Este script configura las variables de entorno durante el despliegue en Vercel
 * Se ejecuta durante el proceso de construcción para asegurar que las variables 
 * de entorno estén correctamente configuradas.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Determinar si estamos en Vercel
const isVercel = process.env.VERCEL === '1';

// Función para crear archivos .env
function createEnvFile(filePath, content) {
  try {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Archivo creado correctamente: ${filePath}`);
  } catch (error) {
    console.error(`❌ Error al crear el archivo ${filePath}:`, error);
  }
}

// Configuración para el cliente en producción
if (isVercel) {
  console.log('🚀 Configurando variables de entorno para Vercel...');
  
  // Crear .env.production para el cliente
  const clientEnvPath = path.join(__dirname, 'client', '.env.production');
  const clientEnvContent = `
REACT_APP_API_URL=${process.env.VERCEL_URL || 'https://controling.vercel.app'}
REACT_APP_ENV=production
  `.trim();
  
  createEnvFile(clientEnvPath, clientEnvContent);
  
  // Crear .env para el servidor
  const serverEnvPath = path.join(__dirname, 'server', '.env');
  const serverEnvContent = `
NODE_ENV=production
MONGODB_URI=${process.env.MONGODB_URI || 'mongodb+srv://jogarcas29:7JAw4tGRRjos9I8d@homeexpenses.acabyfv.mongodb.net/controlling_app'}
JWT_SECRET=${process.env.JWT_SECRET || 'mysecretkey123'}
VERCEL=1
  `.trim();
  
  createEnvFile(serverEnvPath, serverEnvContent);
  
  // Asegurarse de que recharts esté instalado correctamente
  try {
    console.log('📦 Instalando recharts específicamente...');
    execSync('cd client && npm install recharts --save', { stdio: 'inherit' });
    console.log('✅ Recharts instalado correctamente');
  } catch (error) {
    console.error('❌ Error al instalar recharts:', error);
  }
  
  console.log('✅ Configuración de variables de entorno completada');
} else {
  console.log('ℹ️ Ejecutando en entorno local, no se crean archivos .env');
} 