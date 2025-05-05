/**
 * Script para corregir manualmente una asignación específica y su gasto asociado
 * 
 * Ejecución: node server/scripts/quickFixAllocation.js [allocationId]
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { ParticipantAllocation, PersonalExpense, SharedSession, User } = require('../models');

// URL de MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://jogarcas29:7JAw4tGRRjos9I8d@homeexpenses.acabyfv.mongodb.net/controlling_app';

// Obtener ID de asignación de los argumentos
const allocationId = process.argv[2];
if (!allocationId) {
  console.error('Debe proporcionar un ID de asignación como argumento');
  console.log('Uso: node server/scripts/quickFixAllocation.js [allocationId]');
  process.exit(1);
}

console.log(`Reparando asignación: ${allocationId}`);

// Conexión a MongoDB
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(async () => {
  console.log('MongoDB conectado');
  
  try {
    // 1. Buscar la asignación
    const allocation = await ParticipantAllocation.findById(allocationId);
    if (!allocation) {
      console.error(`No se encontró la asignación con ID: ${allocationId}`);
      process.exit(1);
    }
    
    console.log('Asignación encontrada:', allocation);
    
    // 2. Buscar la sesión
    const session = await SharedSession.findById(allocation.sessionId);
    if (!session) {
      console.error(`No se encontró la sesión con ID: ${allocation.sessionId}`);
      process.exit(1);
    }
    
    console.log('Sesión encontrada:', session.name);
    
    // 3. Buscar información de usuario
    const user = await User.findById(allocation.userId);
    const userName = user ? (user.username || user.name || allocation.name) : allocation.name;
    console.log('Usuario:', userName);
    
    // 4. Buscar si ya existe un gasto personal asociado
    let personalExpense = null;
    if (allocation.personalExpenseId) {
      personalExpense = await PersonalExpense.findById(allocation.personalExpenseId);
      console.log('Gasto personal asociado:', personalExpense ? 'Encontrado' : 'No encontrado');
    }
    
    if (!personalExpense) {
      // Buscar por allocationId
      personalExpense = await PersonalExpense.findOne({ allocationId: allocation._id });
      console.log('Búsqueda por allocationId:', personalExpense ? 'Encontrado' : 'No encontrado');
    }
    
    // 5. Crear o actualizar el gasto personal
    if (personalExpense) {
      console.log('Actualizando gasto personal existente...');
      
      // Actualizar gasto existente
      personalExpense.user = allocation.userId.toString();
      personalExpense.name = session.name;
      personalExpense.description = `Gasto compartido - ${session.name} (${userName})`;
      personalExpense.amount = allocation.amount;
      personalExpense.currency = allocation.currency || 'EUR';
      personalExpense.category = 'Gastos compartidos';
      personalExpense.date = new Date();
      personalExpense.type = 'expense';
      personalExpense.isRecurring = false;
      personalExpense.allocationId = allocation._id;
      personalExpense.sessionReference = {
        sessionId: allocation.sessionId,
        sessionName: session.name,
        percentage: allocation.percentage,
        isRecurringShare: session.sessionType === 'permanent'
      };
      
      await personalExpense.save();
      console.log('Gasto personal actualizado:', personalExpense._id);
    } else {
      console.log('Creando nuevo gasto personal...');
      
      // Crear nuevo gasto
      personalExpense = new PersonalExpense({
        user: allocation.userId.toString(),
        name: session.name,
        description: `Gasto compartido - ${session.name} (${userName})`,
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
      
      await personalExpense.save();
      console.log('Nuevo gasto personal creado:', personalExpense._id);
    }
    
    // 6. Actualizar la referencia en la asignación
    if (!allocation.personalExpenseId || allocation.personalExpenseId.toString() !== personalExpense._id.toString()) {
      allocation.personalExpenseId = personalExpense._id;
      
      // Desactivar el hook post-save temporalmente
      const originalListeners = ParticipantAllocation.listeners('save');
      ParticipantAllocation.removeAllListeners('save');
      
      await allocation.save();
      
      // Restaurar los listeners originales
      originalListeners.forEach(listener => {
        ParticipantAllocation.on('save', listener);
      });
      
      console.log('Actualizada referencia en asignación');
    }
    
    console.log('Operación completada con éxito');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    mongoose.connection.close();
    console.log('Conexión cerrada');
    process.exit(0);
  }
})
.catch(err => {
  console.error('Error de conexión:', err.message);
  process.exit(1);
}); 