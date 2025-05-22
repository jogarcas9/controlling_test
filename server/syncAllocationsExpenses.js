const mongoose = require('mongoose');
const { SharedSession, ParticipantAllocation } = require('./models');
const allocationSyncService = require('./services/allocationSyncService');

async function main() {
  try {
    console.log('Conectando a MongoDB...');
    
    // Conectar primero a la base de datos controlling_v2 que tiene sesiones
    const dbName = 'controlling_v2';
    try {
      await mongoose.connect(`mongodb://localhost:27017/${dbName}`);
      console.log(`✅ Conexión establecida a ${dbName}`);
    } catch (dbError) {
      console.error(`Error al conectar a ${dbName}:`, dbError.message);
      
      // Probar con bases de datos alternativas
      const alternativeDbNames = ['controlling_app_test', 'controlingapp', 'controling', 'myapp'];
      let connected = false;
      
      for (const altDbName of alternativeDbNames) {
        try {
          console.log(`Intentando con base de datos alternativa: ${altDbName}`);
          await mongoose.connect(`mongodb://localhost:27017/${altDbName}`);
          console.log(`✅ Conexión establecida a ${altDbName}`);
          connected = true;
          break;
        } catch (altError) {
          console.log(`❌ No se pudo conectar a ${altDbName}`);
        }
      }
      
      if (!connected) {
        throw new Error("No se pudo conectar a ninguna base de datos");
      }
    }
    
    // Buscar todas las sesiones compartidas
    console.log('\nBuscando sesiones compartidas...');
    const sessions = await SharedSession.find({});
    
    if (sessions.length === 0) {
      console.log('No se encontraron sesiones compartidas.');
      return;
    }
    
    console.log(`Se encontraron ${sessions.length} sesiones compartidas.`);
    
    // Mostrar información básica de cada sesión
    sessions.forEach((session, index) => {
      const participantCount = session.participants ? session.participants.length : 0;
      const yearCount = session.yearlyExpenses ? session.yearlyExpenses.length : 0;
      
      console.log(`[${index + 1}] "${session.name}" (ID: ${session._id})`);
      console.log(`    Participantes: ${participantCount}`);
      console.log(`    Años: ${yearCount}`);
    });
    
    // Procesar cada sesión
    for (const session of sessions) {
      console.log(`\nProcesando sesión: "${session.name}" (${session._id})`);
      
      // Encontrar todos los meses con gastos
      const monthsWithExpenses = [];
      
      // Para cada año en la sesión
      if (session.yearlyExpenses && Array.isArray(session.yearlyExpenses)) {
        for (const yearData of session.yearlyExpenses) {
          if (!yearData.months || !Array.isArray(yearData.months)) continue;
          
          for (const monthData of yearData.months) {
            if (!monthData.expenses || !Array.isArray(monthData.expenses)) continue;
            
            // Si el mes tiene gastos, agregarlo a la lista
            if (monthData.expenses.length > 0) {
              monthsWithExpenses.push({ 
                year: yearData.year, 
                month: monthData.month, 
                count: monthData.expenses.length,
                total: monthData.totalAmount || 0
              });
            }
          }
        }
      }
      
      console.log(`Meses con gastos: ${monthsWithExpenses.length}`);
      
      if (monthsWithExpenses.length === 0) {
        console.log('Esta sesión no tiene gastos. Continuando con la siguiente...');
        continue;
      }
      
      // Mostrar información detallada de los meses con gastos
      monthsWithExpenses.forEach(({ year, month, count, total }) => {
        console.log(`    ${month+1}/${year}: ${count} gastos, total: ${total}`);
      });
      
      // Para cada mes con gastos, sincronizar asignaciones
      let procesados = 0;
      
      for (const { year, month, count, total } of monthsWithExpenses) {
        console.log(`\nSincronizando ${count} gastos para ${month+1}/${year} (total: ${total})`);
        try {
          await allocationSyncService.syncMonthlyAllocations(session._id, year, month);
          console.log(`✅ Asignaciones actualizadas para ${month+1}/${year}`);
          procesados++;
        } catch (error) {
          console.error(`❌ Error al sincronizar asignaciones para ${month+1}/${year}:`, error.message);
        }
      }
      
      console.log(`\nSincronización completada para sesión "${session.name}": ${procesados}/${monthsWithExpenses.length} meses procesados.`);
    }
    
    // Verificar cuántas asignaciones tienen expenses completos
    const allocationStats = await checkAllocationExpenses();
    
    console.log('\n✅ Sincronización global completada.');
    console.log(`Total de asignaciones: ${allocationStats.total}`);
    console.log(`Asignaciones con gastos: ${allocationStats.withExpenses}`);
    console.log(`Asignaciones sin gastos: ${allocationStats.withoutExpenses}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Desconectado de MongoDB');
  }
}

// Función para verificar cuántas asignaciones tienen gastos
async function checkAllocationExpenses() {
  const allAllocations = await ParticipantAllocation.find({});
  const withExpenses = allAllocations.filter(a => a.expenses && a.expenses.length > 0).length;
  const withoutExpenses = allAllocations.filter(a => !a.expenses || a.expenses.length === 0).length;
  
  return {
    total: allAllocations.length,
    withExpenses,
    withoutExpenses
  };
}

main(); 