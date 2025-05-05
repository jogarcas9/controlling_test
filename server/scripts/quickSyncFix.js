/**
 * Script simplificado para forzar la sincronización de asignaciones a gastos personales
 * 
 * Ejecución: node server/scripts/quickSyncFix.js
 */

// URL de MongoDB - La misma que se usa en el resto de la aplicación
const MONGODB_URI = 'mongodb+srv://jogarcas29:7JAw4tGRRjos9I8d@homeexpenses.acabyfv.mongodb.net/controlling_app';

const mongoose = require('mongoose');

// Conexión a MongoDB
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(async () => {
  console.log('MongoDB conectado');
  
  // Importar modelos después de establecer la conexión
  const ParticipantAllocation = mongoose.model('ParticipantAllocation');
  const PersonalExpense = mongoose.model('PersonalExpense');
  const SharedSession = mongoose.model('SharedSession');
  
  try {
    // 1. Obtener asignaciones pendientes
    console.log('Buscando asignaciones pendientes...');
    const allocations = await ParticipantAllocation.find({
      personalExpenseId: null
    });
    
    console.log(`Se encontraron ${allocations.length} asignaciones sin gastos personales asociados`);
    
    // 2. Procesar cada asignación
    let created = 0;
    let errors = 0;
    
    for (const allocation of allocations) {
      try {
        // Obtener información de la sesión
        const session = await SharedSession.findById(allocation.sessionId);
        if (!session) {
          console.log(`Sesión no encontrada para asignación: ${allocation._id}`);
          continue;
        }
        
        // Crear gasto personal
        const expense = new PersonalExpense({
          user: allocation.userId.toString(),
          name: session.name,
          description: `Gasto compartido - ${session.name} (${allocation.name})`,
          amount: allocation.amount,
          currency: allocation.currency || 'EUR',
          category: 'Gastos compartidos',
          date: new Date(),
          type: 'expense',
          isRecurring: false,
          allocationId: allocation._id,
          sessionReference: {
            sessionId: allocation.sessionId,
            sessionName: session.name,
            percentage: allocation.percentage,
            isRecurringShare: session.sessionType === 'permanent'
          }
        });
        
        // Guardar gasto
        await expense.save();
        
        // Actualizar asignación con referencia al gasto
        allocation.personalExpenseId = expense._id;
        await allocation.save();
        
        console.log(`✅ Creado gasto ${expense._id} para asignación ${allocation._id}`);
        created++;
      } catch (error) {
        console.error(`❌ Error procesando asignación ${allocation._id}:`, error.message);
        errors++;
      }
    }
    
    // 3. Mostrar resumen
    console.log('\nResumen:');
    console.log(`- Gastos creados: ${created}`);
    console.log(`- Errores: ${errors}`);
    
    // 4. Cerrar conexión
    mongoose.connection.close();
    console.log('Operación completada');
  } catch (error) {
    console.error('Error general:', error);
  } finally {
    process.exit(0);
  }
})
.catch(err => {
  console.error('Error de conexión a MongoDB:', err.message);
  process.exit(1);
}); 