/**
 * Script para corregir directamente los nombres de los gastos compartidos en la base de datos
 * Este script usa updateMany para actualizar directamente los documentos sin activar los hooks
 * 
 * Uso: node server/utils/correctSharedExpenseNames.js
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
    
    // No necesitamos cargar los modelos completos, usaremos el modelo básico
    const db = mongoose.connection;
    
    return db;
  } catch (err) {
    console.error('Error al conectar a MongoDB:', err.message);
    process.exit(1);
  }
};

// Función para buscar y corregir gastos con un patrón específico en el nombre
const fixExpensesWithPattern = async (db) => {
  try {
    // Colección de gastos personales
    const personalExpenses = db.collection('personalexpenses');
    
    // 1. Primero, encontremos todos los gastos con nombres que contienen " - "
    const expensesWithPattern = await personalExpenses.find({
      name: { $regex: ' - ' }
    }).toArray();
    
    console.log(`Encontrados ${expensesWithPattern.length} gastos con " - " en el nombre`);
    
    // 2. Luego actualicemos específicamente los gastos compartidos
    const result = await personalExpenses.updateMany(
      { 
        // Filtro: buscar gastos compartidos con un patrón específico en el nombre
        $or: [
          { isFromSharedSession: true, name: { $regex: ' - ' } },
          { 'sessionReference.sessionId': { $exists: true, $ne: null }, name: { $regex: ' - ' } }
        ]
      },
      [
        {
          // Actualización: extraer solo la primera parte del nombre (antes del guión)
          $set: {
            name: { $arrayElemAt: [{ $split: ["$name", " - "] }, 0] }
          }
        }
      ]
    );
    
    console.log(`Resultado de la actualización directa:`);
    console.log(`  - Documentos encontrados: ${result.matchedCount}`);
    console.log(`  - Documentos actualizados: ${result.modifiedCount}`);
    
    // 3. Ahora actualicemos los gastos basándonos en el nombre de la sesión
    const gastosSinReferenciaCorrecta = await personalExpenses.find({
      isFromSharedSession: true,
      'sessionReference.sessionName': { $exists: true, $ne: null },
      $expr: { $ne: ["$name", "$sessionReference.sessionName"] }
    }).toArray();
    
    console.log(`\nEncontrados ${gastosSinReferenciaCorrecta.length} gastos donde el nombre no coincide con la sesión`);
    
    if (gastosSinReferenciaCorrecta.length > 0) {
      const result2 = await personalExpenses.updateMany(
        {
          isFromSharedSession: true,
          'sessionReference.sessionName': { $exists: true, $ne: null },
          $expr: { $ne: ["$name", "$sessionReference.sessionName"] }
        },
        [
          {
            $set: {
              name: "$sessionReference.sessionName"
            }
          }
        ]
      );
      
      console.log(`Resultado de la segunda actualización:`);
      console.log(`  - Documentos encontrados: ${result2.matchedCount}`);
      console.log(`  - Documentos actualizados: ${result2.modifiedCount}`);
    }
    
    // 4. Además, asegurarse de que todos los gastos con allocationId estén marcados como isFromSharedSession
    const result3 = await personalExpenses.updateMany(
      {
        allocationId: { $exists: true, $ne: null },
        isFromSharedSession: { $ne: true }
      },
      {
        $set: { isFromSharedSession: true }
      }
    );
    
    console.log(`\nActualización de isFromSharedSession para gastos con allocationId:`);
    console.log(`  - Documentos encontrados: ${result3.matchedCount}`);
    console.log(`  - Documentos actualizados: ${result3.modifiedCount}`);
    
    return {
      totalFound: expensesWithPattern.length,
      fixedByNamePattern: result.modifiedCount,
      fixedBySessionRef: gastosSinReferenciaCorrecta.length > 0 ? result2.modifiedCount : 0,
      fixedFromAllocation: result3.modifiedCount
    };
  } catch (error) {
    console.error('Error al corregir gastos:', error);
    throw error;
  }
};

// Función principal
const main = async () => {
  let db;
  try {
    console.log("=== CORRECCIÓN DE NOMBRES DE GASTOS COMPARTIDOS ===\n");
    
    // Conectar a la base de datos
    db = await connectDB();
    
    // Corregir los nombres con actualización directa
    const results = await fixExpensesWithPattern(db);
    
    console.log("\n=== RESUMEN DE ACTUALIZACIONES ===");
    console.log(`Total de gastos con patrón " - " encontrados: ${results.totalFound}`);
    console.log(`Gastos corregidos por patrón de nombre: ${results.fixedByNamePattern}`);
    console.log(`Gastos corregidos por referencia de sesión: ${results.fixedBySessionRef}`);
    console.log(`Gastos corregidos por tener allocationId: ${results.fixedFromAllocation}`);
    
    console.log('\nProceso completado con éxito');
  } catch (error) {
    console.error('Error en el proceso principal:', error);
  } finally {
    // Cerrar conexión
    if (db) {
      await mongoose.connection.close();
      console.log('Conexión a MongoDB cerrada');
    }
    process.exit(0);
  }
};

// Ejecutar script
main(); 