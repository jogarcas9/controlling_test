const mongoose = require('mongoose');
const { SharedSession, ParticipantAllocation } = require('./models');
const allocationSyncService = require('./services/allocationSyncService');

async function main() {
  try {
    console.log('Conectando a MongoDB...');
    
    // Probar primero con la base de datos donde encontramos sesiones
    const dbName = 'controlling_v2';
    console.log(`Intentando conectar a ${dbName}...`);
    
    try {
      await mongoose.connect(`mongodb://localhost:27017/${dbName}`);
      console.log(`✅ Conexión establecida a ${dbName}`);
    } catch (error) {
      console.error(`Error al conectar a ${dbName}:`, error.message);
      
      // Intentar con alternativas si falla
      const alternativeDbNames = ['controlling_app_test', 'controlingapp', 'controling', 'myapp'];
      let connected = false;
      
      for (const altDbName of alternativeDbNames) {
        try {
          console.log(`Intentando conexión alternativa a ${altDbName}...`);
          await mongoose.connect(`mongodb://localhost:27017/${altDbName}`);
          console.log(`✅ Conexión alternativa establecida a ${altDbName}`);
          connected = true;
          break;
        } catch (altConnError) {
          console.log(`❌ No se pudo conectar a ${altDbName}`);
        }
      }
      
      if (!connected) {
        throw new Error('No se pudo conectar a ninguna base de datos');
      }
    }

    // ID de la sesión compartida que encontramos en controlling_v2
    const sessionId = '68026ac53d4915fa98db2eea'; // "Hogar"
    
    // Verificar que la sesión existe
    const session = await SharedSession.findById(sessionId);
    if (!session) {
      console.error('Sesión no encontrada');
      
      // Listar sesiones disponibles para ayudar al usuario
      console.log('\nSesiones disponibles:');
      const sessions = await SharedSession.find({}).select('_id name').lean();
      
      if (sessions.length === 0) {
        console.log('No hay sesiones en la base de datos');
      } else {
        sessions.forEach((s, i) => {
          console.log(`[${i+1}] ID: ${s._id}, Nombre: ${s.name}`);
        });
        
        console.log('\nPara usar una sesión específica, actualiza el ID en este script.');
      }
      
      return;
    }
    
    console.log(`Sesión encontrada: ${session.name}`);
    console.log(`Tipo de sesión: ${session.sessionType}`);
    console.log(`Participantes: ${session.participants ? session.participants.length : 0}`);

    // Sincronizar asignaciones para Mayo 2025
    console.log('\nSincronizando Mayo 2025...');
    await allocationSyncService.syncMonthlyAllocations(sessionId, 2025, 4);
    console.log('✅ Mayo 2025 sincronizado');

    // Sincronizar asignaciones para Junio 2025
    console.log('\nSincronizando Junio 2025...');
    await allocationSyncService.syncMonthlyAllocations(sessionId, 2025, 5);
    console.log('✅ Junio 2025 sincronizado');

    // Sincronizar asignaciones para Julio 2025
    console.log('\nSincronizando Julio 2025...');
    await allocationSyncService.syncMonthlyAllocations(sessionId, 2025, 6);
    console.log('✅ Julio 2025 sincronizado');

    // Verificar cuántas asignaciones se crearon
    const allocations = await ParticipantAllocation.find({
      sessionId,
      year: 2025,
      $or: [
        { month: 4 },
        { month: 5 },
        { month: 6 }
      ]
    });

    console.log(`\nTotal de asignaciones creadas/actualizadas: ${allocations.length}`);
    
    // Detalles por mes
    const mayoCount = allocations.filter(a => a.month === 4).length;
    const junioCount = allocations.filter(a => a.month === 5).length;
    const julioCount = allocations.filter(a => a.month === 6).length;
    
    console.log(`- Mayo 2025: ${mayoCount} asignaciones`);
    console.log(`- Junio 2025: ${junioCount} asignaciones`);
    console.log(`- Julio 2025: ${julioCount} asignaciones`);

    // Detalles por participante
    if (allocations.length > 0) {
      console.log('\nDetalles por participante:');
      const participantIds = [...new Set(allocations.map(a => a.userId.toString()))];
      
      for (const participantId of participantIds) {
        const participantAllocs = allocations.filter(a => a.userId.toString() === participantId);
        const participantName = participantAllocs[0]?.name || participantAllocs[0]?.username || 'Participante';
        
        console.log(`\n${participantName} (${participantId}):`);
        for (const alloc of participantAllocs) {
          const monthName = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][alloc.month];
          
          console.log(`  - ${monthName} ${alloc.year}: ${alloc.amount} ${alloc.currency} (${alloc.percentage}%)`);
        }
      }
    }

    console.log('\nSincronización completada con éxito');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Desconectado de MongoDB');
  }
}

main(); 