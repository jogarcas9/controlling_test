const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const glob = require('glob');

// Configuración
const sourceDir = path.join(__dirname, 'public/images');
const outputDir = path.join(__dirname, 'public/images/optimized');
const sizes = [320, 640, 1024, 1920]; // Tamaños para imágenes responsives

// Crear directorio de salida si no existe
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Función para optimizar una imagen
async function optimizeImage(file) {
  const filename = path.basename(file);
  const extname = path.extname(filename).toLowerCase();
  const basename = path.basename(filename, extname);
  
  // Solo procesar imágenes
  if (!['.jpg', '.jpeg', '.png', '.webp'].includes(extname)) {
    console.log(`Saltando ${filename} - formato no soportado`);
    return;
  }
  
  try {
    // Imagen WebP optimizada
    await sharp(file)
      .webp({ quality: 80 })
      .toFile(path.join(outputDir, `${basename}.webp`));
    
    // Crear versiones responsive en WebP
    for (const size of sizes) {
      await sharp(file)
        .resize(size, null, { withoutEnlargement: true })
        .webp({ quality: 75 })
        .toFile(path.join(outputDir, `${basename}-${size}.webp`));
    }
    
    // También guardar formato original optimizado para compatibilidad
    await sharp(file)
      .jpeg({ quality: 85, progressive: true })
      .toFile(path.join(outputDir, `${basename}${extname}`));
    
    console.log(`✓ Optimizada: ${filename}`);
  } catch (error) {
    console.error(`Error al procesar ${filename}:`, error);
  }
}

// Procesar todas las imágenes
async function processAllImages() {
  try {
    const files = glob.sync(path.join(sourceDir, '**/*.{jpg,jpeg,png,gif,webp}'));
    
    console.log(`Encontradas ${files.length} imágenes para optimizar...`);
    
    // Procesar imágenes en paralelo con límite
    const chunkSize = 5; // Procesar 5 imágenes a la vez
    for (let i = 0; i < files.length; i += chunkSize) {
      const chunk = files.slice(i, i + chunkSize);
      await Promise.all(chunk.map(file => optimizeImage(file)));
    }
    
    console.log('¡Optimización completada!');
  } catch (error) {
    console.error('Error al procesar las imágenes:', error);
  }
}

// Ejecutar
processAllImages(); 