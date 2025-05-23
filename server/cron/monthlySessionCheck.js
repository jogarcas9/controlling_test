const cron = require('node-cron');
const SharedSession = require('../models/SharedSession');
const monthGenerationService = require('../services/monthGenerationService');

// Función para procesar todas las sesiones activas
async function processActiveSessions() {
  try {
    console.log('Iniciando verificación de sesiones para generación de meses...');
    
    // Obtener todas las sesiones activas
    const activeSessions = await SharedSession.find({
      status: 'active',
      sessionType: 'permanent'
    });

    console.log(`Encontradas ${activeSessions.length} sesiones activas para procesar`);

    for (const session of activeSessions) {
      try {
        await monthGenerationService.checkAndGenerateNextMonth(session._id);
        console.log(`Sesión ${session._id} procesada correctamente`);
      } catch (error) {
        console.error(`Error al procesar la sesión ${session._id}:`, error);
      }
    }

    console.log('Verificación de sesiones completada');
  } catch (error) {
    console.error('Error durante el procesamiento de sesiones:', error);
  }
}

// Programar el cron job para ejecutarse todos los días a las 00:01
const scheduledJob = cron.schedule('1 0 * * *', async () => {
  console.log('Ejecutando verificación programada de sesiones...');
  await processActiveSessions();
});

// Exportar el job para poder iniciarlo/detenerlo desde otros lugares
module.exports = scheduledJob; 