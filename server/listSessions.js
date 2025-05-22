const mongoose = require('mongoose');
const { SharedSession } = require('./models');

async function main() {
  try {
    console.log('Conectando a MongoDB...');
    
    // Base de datos correcta para desarrollo
    const dbName = 'controlling_app_test';
    console.log(`Intentando conectar a ${dbName}...`);
    
    try {
      await mongoose.connect(`mongodb://localhost:27017/${dbName}`);
      console.log(`✅ Conexión establecida a ${dbName}`);
    } catch (error) {
      console.error(`Error al conectar a ${dbName}:`, error.message);
      
      // Intentar con bases de datos alternativas
      const alternativeDbNames = ['controlingapp', 'controling', 'myapp'];
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

    // Listar todas las sesiones compartidas
    console.log('\nBuscando sesiones compartidas...');
    const sessions = await SharedSession.find({}).lean();
    
    if (sessions.length === 0) {
      console.log('No se encontraron sesiones compartidas en la base de datos');
      return;
    }
    
    console.log(`\nSe encontraron ${sessions.length} sesiones compartidas:`);
    
    sessions.forEach((session, index) => {
      console.log(`\n[${index + 1}] Sesión: ${session.name}`);
      console.log(`   ID: ${session._id}`);
      console.log(`   Tipo: ${session.sessionType || 'No especificado'}`);
      console.log(`   Participantes: ${session.participants ? session.participants.length : 0}`);
      
      // Mostrar información sobre los participantes
      if (session.participants && session.participants.length > 0) {
        console.log('   Detalle de participantes:');
        session.participants.forEach((participant, i) => {
          const userId = participant.userId ? 
            (typeof participant.userId === 'object' ? participant.userId._id : participant.userId) : 
            'No asignado';
          console.log(`     ${i+1}. ${participant.name || participant.email} (ID: ${userId})`);
        });
      }
      
      // Mostrar información sobre asignaciones
      if (session.allocations && session.allocations.length > 0) {
        console.log('   Asignaciones:');
        session.allocations.forEach((allocation, i) => {
          console.log(`     ${i+1}. ${allocation.name}: ${allocation.percentage}%`);
        });
      }
      
      // Mostrar información sobre meses con datos
      if (session.yearlyExpenses && Array.isArray(session.yearlyExpenses)) {
        session.yearlyExpenses.forEach(yearData => {
          if (yearData.months && Array.isArray(yearData.months)) {
            const monthsWithExpenses = yearData.months.filter(m => 
              m.expenses && Array.isArray(m.expenses) && m.expenses.length > 0
            );
            
            if (monthsWithExpenses.length > 0) {
              console.log(`   Año ${yearData.year}: ${monthsWithExpenses.length} meses con gastos`);
              monthsWithExpenses.forEach(month => {
                const monthName = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                                  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][month.month];
                console.log(`     - ${monthName} (${month.month}): ${month.expenses.length} gastos, Total: ${month.totalAmount}`);
              });
            }
          }
        });
      }
    });
    
    console.log('\nPara sincronizar una sesión específica, actualiza el ID en el script syncAllocations.js');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Desconectado de MongoDB');
  }
}

main(); 