const mongoose = require('mongoose');

async function main() {
  try {
    console.log('Conectando a MongoDB...');
    
    // Conectar inicialmente a admin para poder listar todas las bases de datos
    await mongoose.connect('mongodb://localhost:27017/admin');
    console.log('✅ Conexión establecida a MongoDB');
    
    // Obtener el cliente de conexión
    const db = mongoose.connection.db;
    const adminDb = db.admin();
    
    // Listar todas las bases de datos
    const dbInfo = await adminDb.listDatabases();
    console.log(`\nBases de datos disponibles (${dbInfo.databases.length}):`);
    
    // Ordenar por nombre
    const sortedDbs = [...dbInfo.databases].sort((a, b) => a.name.localeCompare(b.name));
    
    // Examinar cada base de datos
    for (const database of sortedDbs) {
      // Ignorar bases de datos del sistema
      if (['admin', 'config', 'local'].includes(database.name)) {
        continue;
      }
      
      console.log(`\n📁 ${database.name} (${(database.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`);
      
      try {
        // Conectar a esta base de datos específica
        await mongoose.disconnect();
        await mongoose.connect(`mongodb://localhost:27017/${database.name}`);
        
        // Obtener todas las colecciones
        const collections = await mongoose.connection.db.listCollections().toArray();
        
        if (collections.length === 0) {
          console.log('   No tiene colecciones');
          continue;
        }
        
        // Ordenar colecciones por nombre
        collections.sort((a, b) => a.name.localeCompare(b.name));
        
        // Mostrar información de cada colección
        for (const collection of collections) {
          const count = await mongoose.connection.db.collection(collection.name).countDocuments();
          console.log(`   📄 ${collection.name} (${count} documentos)`);
          
          // Si es SharedSession o ParticipantAllocation, mostrar algunos documentos
          if (['sharedsessions', 'participantallocations'].includes(collection.name.toLowerCase())) {
            const documents = await mongoose.connection.db.collection(collection.name)
              .find({})
              .limit(5)
              .toArray();
            
            // Mostrar IDs de las sesiones
            if (documents.length > 0) {
              if (collection.name.toLowerCase() === 'sharedsessions') {
                console.log('      IDs de sesiones:');
                documents.forEach((doc, i) => {
                  console.log(`      ${i+1}. ${doc._id} - ${doc.name || 'Sin nombre'}`);
                });
              } else {
                console.log('      IDs de asignaciones:');
                documents.forEach((doc, i) => {
                  console.log(`      ${i+1}. ${doc._id} - Sesión: ${doc.sessionId}, Usuario: ${doc.userId}`);
                });
              }
            }
          }
        }
      } catch (err) {
        console.error(`   Error al examinar la base de datos ${database.name}:`, err.message);
      }
    }
    
    console.log('\n✅ Análisis de bases de datos completado');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Desconectado de MongoDB');
  }
}

main(); 