const mongoose = require('mongoose');
const { SharedSession, ParticipantAllocation } = require('./models');
const allocationSyncService = require('./services/allocationSyncService');

// ID de la sesión que necesitamos sincronizar
// Reemplazar con el ID que aparece en MongoDB Compass
const SESSION_ID = '682c6255a4d885d9754a0554';

async function main() {
  try {
    console.log('Conectando a MongoDB...');
    
    // Conectarse a la base de datos remota que se muestra en MongoDB Compass
    try {
      await mongoose.connect('mongodb+srv://homeexpenses.acabyfv.mongodb.net/controlling_app_test', {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        user: 'admin', // Usuario predeterminado, cambiar si es necesario
        pass: 'password' // Contraseña predeterminada, cambiar si es necesaria
      });
      console.log('✅ Conexión establecida a la base de datos remota');
    } catch (error) {
      console.error('Error al conectar a MongoDB:', error.message);
      process.exit(1);
    }
    
    // Buscar la sesión específica
    console.log(`\nBuscando sesión ${SESSION_ID}...`);
    const session = await SharedSession.findById(SESSION_ID);
    
    if (!session) {
      console.error(`❌ No se encontró la sesión con ID ${SESSION_ID}`);
      process.exit(1);
    }
    
    console.log(`✅ Sesión encontrada: ${session.name}`);
    console.log(`   Participantes: ${session.participants?.length || 0}`);
    
    // Obtener todos los meses con gastos
    const monthsWithExpenses = [];
    
    if (!session.yearlyExpenses || !Array.isArray(session.yearlyExpenses)) {
      console.error('❌ La sesión no tiene estructura yearlyExpenses');
      process.exit(1);
    }
    
    // Encontrar todos los meses con gastos
    for (const yearData of session.yearlyExpenses) {
      if (!yearData.months || !Array.isArray(yearData.months)) continue;
      
      for (const monthData of yearData.months) {
        if (!monthData.expenses || !Array.isArray(monthData.expenses)) continue;
        
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
    
    console.log(`\nSe encontraron ${monthsWithExpenses.length} meses con gastos:`);
    
    // Mostrar detalle de gastos por mes
    if (monthsWithExpenses.length > 0) {
      for (const { year, month, count, total } of monthsWithExpenses) {
        console.log(`   - ${month+1}/${year}: ${count} gastos, total: ${total}`);
      }
    } else {
      console.log('❌ La sesión no tiene gastos registrados');
      process.exit(1);
    }
    
    // Buscar asignaciones existentes
    console.log('\nBuscando asignaciones existentes...');
    const allocations = await ParticipantAllocation.find({ sessionId: SESSION_ID });
    
    console.log(`Se encontraron ${allocations.length} asignaciones existentes.`);
    
    // Mostrar estado actual de las asignaciones
    if (allocations.length > 0) {
      // Agrupar por año/mes
      const allocByMonth = {};
      
      for (const alloc of allocations) {
        const key = `${alloc.year}-${alloc.month}`;
        if (!allocByMonth[key]) {
          allocByMonth[key] = [];
        }
        allocByMonth[key].push(alloc);
      }
      
      console.log('\nEstado actual de asignaciones:');
      
      for (const key in allocByMonth) {
        const [year, month] = key.split('-');
        const allocs = allocByMonth[key];
        const totalAmount = allocs.reduce((sum, a) => sum + a.amount, 0);
        const withExpenses = allocs.filter(a => a.expenses && a.expenses.length > 0).length;
        
        console.log(`   ${month}/${year}: ${allocs.length} asignaciones, total: ${totalAmount}, con gastos: ${withExpenses}`);
      }
    }
    
    // Forzar la sincronización de todos los meses con gastos
    console.log('\nIniciando sincronización forzada de todos los meses con gastos...');
    
    let processed = 0;
    for (const { year, month, count } of monthsWithExpenses) {
      console.log(`\nSincronizando ${month+1}/${year} (${count} gastos)...`);
      
      try {
        await allocationSyncService.syncMonthlyAllocations(SESSION_ID, year, month);
        console.log(`✅ Sincronización completada para ${month+1}/${year}`);
        processed++;
      } catch (error) {
        console.error(`❌ Error sincronizando ${month+1}/${year}:`, error.message);
      }
    }
    
    console.log(`\n✅ Sincronización completada: ${processed}/${monthsWithExpenses.length} meses procesados`);
    
    // Verificar resultado de la sincronización
    console.log('\nVerificando resultado de la sincronización...');
    
    const updatedAllocations = await ParticipantAllocation.find({ sessionId: SESSION_ID });
    const withExpenses = updatedAllocations.filter(a => a.expenses && a.expenses.length > 0).length;
    
    console.log(`Asignaciones totales: ${updatedAllocations.length}`);
    console.log(`Asignaciones con gastos: ${withExpenses}`);
    console.log(`Asignaciones sin gastos: ${updatedAllocations.length - withExpenses}`);
    
    // Mostrar algunas asignaciones para comprobar
    if (updatedAllocations.length > 0) {
      console.log('\nDetalles de algunas asignaciones actualizadas:');
      
      // Tomar 3 asignaciones como muestra
      const sampleAllocations = updatedAllocations.slice(0, 3);
      
      for (const alloc of sampleAllocations) {
        console.log(`\nAsignación ${alloc._id}:`);
        console.log(`   Usuario: ${alloc.name || alloc.username}`);
        console.log(`   Período: ${alloc.month+1}/${alloc.year}`);
        console.log(`   Monto: ${alloc.amount} ${alloc.currency} (${alloc.percentage}%)`);
        console.log(`   Total de sesión: ${alloc.totalAmount} ${alloc.currency}`);
        console.log(`   Gastos asociados: ${alloc.expenses?.length || 0}`);
        
        if (alloc.expenses && alloc.expenses.length > 0) {
          console.log('   Detalle de gastos:');
          alloc.expenses.slice(0, 3).forEach((exp, i) => {
            console.log(`     ${i+1}. ${exp.name || exp.expenseId}: ${exp.amount} ${alloc.currency}`);
          });
          
          if (alloc.expenses.length > 3) {
            console.log(`     ... y ${alloc.expenses.length - 3} gastos más`);
          }
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDesconectado de MongoDB');
  }
}

main(); 