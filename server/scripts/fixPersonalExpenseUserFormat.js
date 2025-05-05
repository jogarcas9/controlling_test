/**
 * Script para corregir el formato del campo user en los gastos personales
 * Este script asegura que todos los gastos personales tengan el campo user como string
 * 
 * Ejecución: node server/scripts/fixPersonalExpenseUserFormat.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { PersonalExpense } = require('../models');

// URL de MongoDB - La misma que se usa en el resto de la aplicación
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://jogarcas29:7JAw4tGRRjos9I8d@homeexpenses.acabyfv.mongodb.net/controlling_app';

// Conexión a MongoDB
const connectDB = async () => {
  try {
    console.log('Intentando conectar a MongoDB...');
    const conn = await mongoose.connect(MONGODB_URI, {
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
  console.log('Iniciando corrección de formato de user en gastos personales...');
  
  // Conectar a la base de datos
  const conn = await connectDB();
  
  // Estadísticas
  const stats = {
    total: 0,
    procesados: 0,
    corregidos: 0,
    errores: []
  };
  
  try {
    // Obtener todos los gastos personales con campo user que no sea string
    const pipeline = [
      {
        $addFields: {
          userType: { $type: "$user" }
        }
      },
      {
        $match: {
          $or: [
            { userType: { $ne: "string" } },
            { userType: { $exists: false } }
          ]
        }
      }
    ];
    
    const expenses = await PersonalExpense.aggregate(pipeline);
    stats.total = expenses.length;
    
    console.log(`Se encontraron ${stats.total} gastos personales con formato incorrecto de user`);
    
    // Procesar cada gasto
    for (const expense of expenses) {
      try {
        stats.procesados++;
        console.log(`\nProcesando gasto ${expense._id} (${stats.procesados}/${stats.total})`);
        
        // Obtener el documento completo
        const expenseDoc = await PersonalExpense.findById(expense._id);
        
        if (!expenseDoc) {
          console.log(`Gasto ${expense._id} no encontrado, puede haber sido eliminado`);
          continue;
        }
        
        // Verificar y corregir el campo user
        const userAntes = expenseDoc.user;
        const userType = typeof userAntes;
        
        if (userType !== 'string' && userAntes) {
          // Convertir a string
          expenseDoc.user = userAntes.toString();
          await expenseDoc.save();
          
          console.log(`Corregido: user cambiado de tipo ${userType} a string`);
          console.log(`Valor anterior: ${userAntes}, Valor nuevo: ${expenseDoc.user}`);
          
          stats.corregidos++;
        } else if (!userAntes) {
          console.log(`Gasto sin user válido: ${expense._id}`);
          stats.errores.push({
            id: expense._id.toString(),
            error: 'Campo user nulo o indefinido'
          });
        } else {
          console.log(`Gasto ya tiene formato correcto: ${expense._id}`);
        }
      } catch (error) {
        console.error(`Error procesando gasto ${expense._id}:`, error.message);
        stats.errores.push({
          id: expense._id.toString(),
          error: error.message
        });
      }
    }
    
    // Resumen
    console.log('\n--- Resumen de la corrección ---');
    console.log(`Total gastos analizados: ${stats.total}`);
    console.log(`Procesados: ${stats.procesados}`);
    console.log(`Corregidos: ${stats.corregidos}`);
    console.log(`Errores: ${stats.errores.length}`);
    
    if (stats.errores.length > 0) {
      console.log('\nErrores encontrados:');
      stats.errores.forEach((err, i) => {
        console.log(`${i+1}. Gasto ${err.id}: ${err.error}`);
      });
    }
    
  } catch (error) {
    console.error('Error global durante la corrección:', error);
  } finally {
    // Cerrar conexión con la base de datos
    await mongoose.connection.close();
    console.log('\nConexión a MongoDB cerrada');
    process.exit(0);
  }
};

// Ejecutar el script
main(); 