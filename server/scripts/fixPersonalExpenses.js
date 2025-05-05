/**
 * Script para revisar y corregir los gastos personales existentes
 * 
 * Ejecución: node server/scripts/fixPersonalExpenses.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { ParticipantAllocation, PersonalExpense, SharedSession } = require('../models');

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
  console.log('Iniciando revisión de gastos personales...');
  
  // Conectar a la base de datos
  const conn = await connectDB();
  
  try {
    // 1. Buscar todos los gastos personales relacionados con asignaciones
    const expensesWithAllocation = await PersonalExpense.find({
      allocationId: { $ne: null }
    });
    
    console.log(`Encontrados ${expensesWithAllocation.length} gastos personales con referencia a asignaciones`);
    
    // 2. Verificar si hay gastos duplicados (mismo allocationId)
    const allocationIds = expensesWithAllocation.map(exp => exp.allocationId.toString());
    const uniqueAllocationIds = [...new Set(allocationIds)];
    
    if (allocationIds.length !== uniqueAllocationIds.length) {
      console.log(`¡Atención! Se encontraron ${allocationIds.length - uniqueAllocationIds.length} gastos duplicados`);
      
      // Agrupar gastos por allocationId
      const expensesByAllocation = {};
      expensesWithAllocation.forEach(exp => {
        const key = exp.allocationId.toString();
        if (!expensesByAllocation[key]) {
          expensesByAllocation[key] = [];
        }
        expensesByAllocation[key].push(exp);
      });
      
      // Procesar duplicados
      for (const [allocationId, expenses] of Object.entries(expensesByAllocation)) {
        if (expenses.length > 1) {
          console.log(`AllocationID ${allocationId} tiene ${expenses.length} gastos asociados`);
          
          // Mantener el más reciente y eliminar los demás
          expenses.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
          const [latest, ...duplicates] = expenses;
          
          console.log(`  Manteniendo gasto ${latest._id} (${latest.updatedAt})`);
          for (const dupe of duplicates) {
            console.log(`  Eliminando duplicado ${dupe._id} (${dupe.updatedAt})`);
            await PersonalExpense.findByIdAndDelete(dupe._id);
          }
          
          // Actualizar la asignación para que apunte al gasto retenido
          const allocation = await ParticipantAllocation.findById(allocationId);
          if (allocation) {
            allocation.personalExpenseId = latest._id;
            await allocation.save();
            console.log(`  Actualizada referencia en asignación ${allocation._id}`);
          }
        }
      }
    }
    
    // 3. Buscar asignaciones que no tengan referencia a un gasto personal
    const allocationsWithoutExpense = await ParticipantAllocation.find({
      $or: [
        { personalExpenseId: null },
        { personalExpenseId: { $exists: false } }
      ]
    });
    
    console.log(`Encontradas ${allocationsWithoutExpense.length} asignaciones sin gasto personal asociado`);
    
    // 4. Buscar gastos huérfanos (con allocationId que ya no existe)
    const orphanExpenses = [];
    for (const expense of expensesWithAllocation) {
      const allocation = await ParticipantAllocation.findById(expense.allocationId);
      if (!allocation) {
        orphanExpenses.push(expense);
      }
    }
    
    console.log(`Encontrados ${orphanExpenses.length} gastos huérfanos`);
    
    if (orphanExpenses.length > 0) {
      console.log('¿Desea eliminar estos gastos huérfanos? (No se eliminarán automáticamente)');
      orphanExpenses.forEach(exp => {
        console.log(`- ID: ${exp._id}, Nombre: ${exp.name}, Monto: ${exp.amount}, AllocationId: ${exp.allocationId}`);
      });
    }
    
    // 5. Verificar integridad de las referencias en ambas direcciones
    const allocationsWithExpense = await ParticipantAllocation.find({
      personalExpenseId: { $ne: null }
    });
    
    console.log(`Verificando integridad de ${allocationsWithExpense.length} asignaciones con gastos asociados...`);
    
    let referenceMismatchCount = 0;
    
    for (const allocation of allocationsWithExpense) {
      const expense = await PersonalExpense.findById(allocation.personalExpenseId);
      
      if (!expense) {
        console.log(`Asignación ${allocation._id} tiene referencia a gasto ${allocation.personalExpenseId} que no existe`);
        // Limpiar referencia
        allocation.personalExpenseId = null;
        await allocation.save();
        console.log(`  Referencia limpiada`);
        referenceMismatchCount++;
        continue;
      }
      
      if (!expense.allocationId || !expense.allocationId.equals(allocation._id)) {
        console.log(`Gasto ${expense._id} no tiene referencia correcta a asignación ${allocation._id}`);
        // Corregir referencia en el gasto
        expense.allocationId = allocation._id;
        await expense.save();
        console.log(`  Referencia corregida`);
        referenceMismatchCount++;
      }
    }
    
    console.log(`Se corrigieron ${referenceMismatchCount} problemas de referencias`);
    
    // 6. Resumen
    console.log('\nResumen de la revisión:');
    console.log(`- Total gastos personales con asignaciones: ${expensesWithAllocation.length}`);
    console.log(`- Gastos duplicados procesados: ${allocationIds.length - uniqueAllocationIds.length}`);
    console.log(`- Asignaciones sin gasto personal: ${allocationsWithoutExpense.length}`);
    console.log(`- Gastos huérfanos encontrados: ${orphanExpenses.length}`);
    console.log(`- Problemas de referencias corregidos: ${referenceMismatchCount}`);
    
  } catch (error) {
    console.error('Error durante la revisión:', error);
  } finally {
    // Cerrar conexión con la base de datos
    await mongoose.connection.close();
    console.log('\nConexión a MongoDB cerrada');
    process.exit(0);
  }
};

// Ejecutar el script
main(); 