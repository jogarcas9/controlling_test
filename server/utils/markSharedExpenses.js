/**
 * Script para marcar todos los gastos personales que provienen de sesiones compartidas
 * Esto asegura que los gastos no sean editables ni eliminables desde la vista de gastos personales
 * 
 * Uso: node server/utils/markSharedExpenses.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Conexión a MongoDB
const connectDB = async () => {
  try {
    // Obtener URL de MongoDB desde .env o usar una URL por defecto
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/controlling_app';
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('MongoDB conectado...');
    
    // Cargar modelos necesarios para el script
    require('../models/PersonalExpense');
    require('../models/ParticipantAllocation');
    require('../models/SharedSession');
    require('../models/User');
    
    console.log('Modelos cargados correctamente.');
  } catch (err) {
    console.error('Error al conectar a MongoDB:', err.message);
    process.exit(1);
  }
};

// Función para marcar gastos compartidos
const markSharedExpenses = async () => {
  console.log('\n==== MARCANDO GASTOS PERSONALES DE SESIONES COMPARTIDAS ====\n');
  
  try {
    // Obtener modelos
    const PersonalExpense = mongoose.model('PersonalExpense');
    const ParticipantAllocation = mongoose.model('ParticipantAllocation');
    const SharedSession = mongoose.model('SharedSession');
    
    // 1. Buscar todos los gastos que tienen allocationId
    const expensesWithAllocation = await PersonalExpense.find({
      allocationId: { $ne: null }
    });
    
    console.log(`Encontrados ${expensesWithAllocation.length} gastos con allocationId`);
    
    // Actualizar todos estos gastos
    let updatedCount1 = 0;
    
    for (const expense of expensesWithAllocation) {
      // Buscar la asignación correspondiente para obtener más datos
      const allocation = await ParticipantAllocation.findById(expense.allocationId);
      
      if (allocation) {
        // Buscar la sesión para obtener el nombre correcto
        const session = await SharedSession.findById(allocation.sessionId);
        
        if (session) {
          // Marcar como gasto de sesión compartida
          expense.isFromSharedSession = true;
          
          // Simplificar el nombre para que sea exactamente el nombre de la sesión
          expense.name = session.name;
          
          // Verificar si la sesión es recurrente
          const isRecurringSession = session.sessionType === 'permanent';
          expense.isRecurring = isRecurringSession;
          
          // Actualizar la referencia de sesión si existe
          if (expense.sessionReference) {
            expense.sessionReference.sessionName = session.name;
            expense.sessionReference.isRecurringShare = isRecurringSession;
          }
          
          await expense.save();
          updatedCount1++;
          
          if (updatedCount1 % 10 === 0) {
            console.log(`Progreso: ${updatedCount1}/${expensesWithAllocation.length} gastos actualizados con allocationId`);
          }
        }
      }
    }
    
    console.log(`Total de gastos con allocationId actualizados: ${updatedCount1}`);
    
    // 2. Buscar todos los gastos que tienen referencia a una sesión
    const expensesWithSessionRef = await PersonalExpense.find({
      'sessionReference.sessionId': { $ne: null }
    });
    
    console.log(`Encontrados ${expensesWithSessionRef.length} gastos con sessionReference`);
    
    // Actualizar todos estos gastos
    let updatedCount2 = 0;
    
    for (const expense of expensesWithSessionRef) {
      // Buscar la sesión para obtener el nombre correcto
      if (expense.sessionReference && expense.sessionReference.sessionId) {
        const session = await SharedSession.findById(expense.sessionReference.sessionId);
        
        if (session) {
          // Marcar como gasto de sesión compartida
          expense.isFromSharedSession = true;
          
          // Simplificar el nombre para que sea exactamente el nombre de la sesión
          expense.name = session.name;
          
          // Verificar si la sesión es recurrente
          const isRecurringSession = session.sessionType === 'permanent';
          expense.isRecurring = isRecurringSession;
          
          // Actualizar la referencia de sesión
          expense.sessionReference.sessionName = session.name;
          expense.sessionReference.isRecurringShare = isRecurringSession;
          
          await expense.save();
          updatedCount2++;
          
          if (updatedCount2 % 10 === 0) {
            console.log(`Progreso: ${updatedCount2}/${expensesWithSessionRef.length} gastos actualizados con sessionReference`);
          }
        }
      }
    }
    
    console.log(`Total de gastos con sessionReference actualizados: ${updatedCount2}`);
    
    // 3. Buscar casos especiales que puedan haberse saltado los filtros anteriores
    const specialCaseExpenses = await PersonalExpense.find({
      $or: [
        { category: 'Gastos Compartidos' },
        { description: { $regex: 'Parte correspondiente', $options: 'i' } }
      ],
      isFromSharedSession: { $ne: true }
    });
    
    console.log(`Encontrados ${specialCaseExpenses.length} gastos especiales que podrían ser compartidos`);
    
    let updatedCount3 = 0;
    
    for (const expense of specialCaseExpenses) {
      // Marcar como gasto de sesión compartida por precaución
      expense.isFromSharedSession = true;
      await expense.save();
      updatedCount3++;
      
      if (updatedCount3 % 10 === 0) {
        console.log(`Progreso: ${updatedCount3}/${specialCaseExpenses.length} gastos especiales actualizados`);
      }
    }
    
    console.log(`Total de gastos especiales actualizados: ${updatedCount3}`);
    
    // 4. Verificación final: todos los gastos marcados como compartidos deben tener nombre simplificado
    const allSharedExpenses = await PersonalExpense.find({ isFromSharedSession: true });
    
    console.log(`Verificando nombre en ${allSharedExpenses.length} gastos marcados como compartidos`);
    
    let nameFixedCount = 0;
    
    for (const expense of allSharedExpenses) {
      let needsUpdate = false;
      
      // Verificar si el nombre contiene "- mes año" y simplificarlo
      if (expense.name && expense.name.includes(' - ')) {
        const simplifiedName = expense.name.split(' - ')[0];
        expense.name = simplifiedName;
        needsUpdate = true;
      }
      
      // Si tiene sessionReference, asegurar que el nombre coincida
      if (expense.sessionReference && expense.sessionReference.sessionName) {
        if (expense.name !== expense.sessionReference.sessionName) {
          expense.name = expense.sessionReference.sessionName;
          needsUpdate = true;
        }
      }
      
      if (needsUpdate) {
        await expense.save();
        nameFixedCount++;
        
        if (nameFixedCount % 10 === 0) {
          console.log(`Progreso: ${nameFixedCount} nombres corregidos`);
        }
      }
    }
    
    console.log(`Total de nombres corregidos: ${nameFixedCount}`);
    
    // Resumen
    console.log('\n==== RESUMEN DE ACTUALIZACIONES ====');
    console.log(`Gastos con allocationId actualizados: ${updatedCount1}`);
    console.log(`Gastos con sessionReference actualizados: ${updatedCount2}`);
    console.log(`Gastos especiales actualizados: ${updatedCount3}`);
    console.log(`Nombres corregidos: ${nameFixedCount}`);
    console.log(`Total de gastos procesados: ${allSharedExpenses.length}`);
    
    // Recuento final
    const finalCount = await PersonalExpense.countDocuments({ isFromSharedSession: true });
    console.log(`\nTotal de gastos marcados como compartidos en base de datos: ${finalCount}`);
    
  } catch (error) {
    console.error('Error al marcar gastos compartidos:', error);
  }
};

// Función principal
const main = async () => {
  try {
    // Conectar a la base de datos
    await connectDB();
    
    // Marcar los gastos
    await markSharedExpenses();
    
    console.log('\nProceso completado');
    
    // Cerrar conexión
    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error en proceso principal:', error);
    process.exit(1);
  }
};

// Ejecutar script
main(); 