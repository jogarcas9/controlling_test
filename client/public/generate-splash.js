const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Asegúrate de que el directorio de salida exista
const outputDir = path.join(__dirname, 'images', 'splash');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Imagen de origen (logo512.png)
const sourcePath = path.join(__dirname, 'images', 'logo512.png');

// Definir los tamaños de pantalla para iOS
const splashScreens = [
  { width: 828, height: 1792, name: 'splash-828x1792.png' },
  { width: 1242, height: 2688, name: 'splash-1242x2688.png' },
  { width: 1125, height: 2436, name: 'splash-1125x2436.png' },
  { width: 1242, height: 2208, name: 'splash-1242x2208.png' },
  { width: 750, height: 1334, name: 'splash-750x1334.png' }
];

// Función para crear una imagen de splash con el logo centrado
async function createSplashScreen(width, height, outputName) {
  console.log(`Generando imagen splash ${width}x${height}...`);
  
  // Crear un fondo blanco
  const canvas = Buffer.from(
    `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="#ffffff"/>
    </svg>`
  );
  
  // Calcular el tamaño del logo (50% del ancho de la pantalla, pero no más grande que el original)
  const logoSize = Math.min(Math.floor(width * 0.5), 512);
  
  // Posición para centrar el logo
  const left = Math.floor((width - logoSize) / 2);
  const top = Math.floor((height - logoSize) / 2);
  
  try {
    // Crear la imagen de fondo
    const background = await sharp(canvas)
      .png()
      .toBuffer();
    
    // Redimensionar el logo
    const logo = await sharp(sourcePath)
      .resize(logoSize, logoSize, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .toBuffer();
    
    // Combinar el fondo y el logo
    await sharp(background)
      .composite([{ input: logo, left, top }])
      .toFile(path.join(outputDir, outputName));
    
    console.log(`Creada imagen splash: ${outputName}`);
  } catch (error) {
    console.error(`Error al crear ${outputName}:`, error);
  }
}

// Generar todas las imágenes de splash
async function generateSplashScreens() {
  console.log('Iniciando generación de imágenes splash para iOS...');
  
  for (const screen of splashScreens) {
    await createSplashScreen(screen.width, screen.height, screen.name);
  }
  
  console.log('Generación de imágenes splash completada.');
}

// Ejecutar el script
generateSplashScreens().catch(err => {
  console.error('Error durante la generación de imágenes:', err);
}); 