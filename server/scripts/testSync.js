/**
 * Script para probar la sincronización de una asignación específica
 * 
 * Ejecución: node server/scripts/testSync.js <allocationId>
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { ParticipantAllocation, PersonalExpense } = require('../models');
const syncService = require('../services/syncService');

// Conexión a MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log(`MongoDB conectado: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`Error de conexión a MongoDB: ${error.message}`);
    process.exit(1);
  }
};

// Función principal
const main = async () => {
  // Obtener ID de asignación de los argumentos
  const allocationId = process.argv[2];
  
  if (!allocationId) {
    console.error('Debe proporcionar un ID de asignación como argumento');
    process.exit(1);
  }
  
  console.log(`Probando sincronización para asignación: ${allocationId}`);
  
  // Conectar a la base de datos
  const conn = await connectDB();
  
  try {
    // Buscar la asignación
    const allocation = await ParticipantAllocation.findById(allocationId);
    
    if (!allocation) {
      console.error(`No se encontró la asignación con ID: ${allocationId}`);
      process.exit(1);
    }
    
    console.log('Información de la asignación:');
    console.log(`- ID: ${allocation._id}`);
    console.log(`- Usuario: ${allocation.userId}`);
    console.log(`- Sesión: ${allocation.sessionId}`);
    console.log(`- Monto: ${allocation.amount} ${allocation.currency}`);
    console.log(`- Porcentaje: ${allocation.percentage}%`);
    console.log(`- Estado: ${allocation.status}`);
    console.log(`- Gasto personal asociado: ${allocation.personalExpenseId || 'No tiene'}`);
    
    // Comprobar si ya tiene un gasto asociado
    if (allocation.personalExpenseId) {
      const existingExpense = await PersonalExpense.findById(allocation.personalExpenseId);
      if (existingExpense) {
        console.log('Ya tiene un gasto personal asociado:');
        console.log(`- ID: ${existingExpense._id}`);
        console.log(`- Nombre: ${existingExpense.name}`);
        console.log(`- Monto: ${existingExpense.amount} ${existingExpense.currency}`);
        console.log(`- Usuario: ${existingExpense.user}`);
      } else {
        console.log('Tiene un ID de gasto asociado pero no se encontró el gasto en la base de datos');
      }
    }
    
    // Ejecutar sincronización
    console.log('\nEjecutando sincronización...');
    const result = await syncService.syncAllocationToPersonalExpense(allocation);
    
    // Verificar resultado
    console.log('\nResultado de la sincronización:');
    if (result.success) {
      console.log('✅ Sincronización exitosa');
      console.log(`- ID del gasto: ${result.personalExpense._id}`);
      console.log(`- Nombre: ${result.personalExpense.name}`);
      console.log(`- Monto: ${result.personalExpense.amount} ${result.personalExpense.currency}`);
      console.log(`- Usuario: ${result.personalExpense.user}`);
      
      // Comprobar que la referencia se ha actualizado en la asignación
      const updatedAllocation = await ParticipantAllocation.findById(allocationId);
      if (updatedAllocation.personalExpenseId && updatedAllocation.personalExpenseId.equals(result.personalExpense._id)) {
        console.log('✅ La referencia en la asignación se ha actualizado correctamente');
      } else {
        console.log('❌ La referencia en la asignación NO se ha actualizado correctamente');
      }
    } else {
      console.log('❌ La sincronización falló');
    }
    
  } catch (error) {
    console.error('Error durante la prueba:', error);
  } finally {
    // Cerrar conexión con la base de datos
    await mongoose.connection.close();
    console.log('\nConexión a MongoDB cerrada');
    process.exit(0);
  }
};

// Ejecutar el script
main(); 