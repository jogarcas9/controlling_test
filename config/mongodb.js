const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    console.log('Intentando conectar a MongoDB con URI:', process.env.MONGODB_URI);
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    console.log(`Base de datos actual: ${conn.connection.db.databaseName}`);
    return true;
  } catch (error) {
    console.error(`Error: ${error.message}`);
    return false;
  }
};

const retryConnection = async (maxRetries = 5, delay = 5000) => {
  for (let i = 0; i < maxRetries; i++) {
    const connected = await connectDB();
    if (connected) return true;
    
    console.log(`Intento ${i + 1} fallido. Reintentando en ${delay/1000} segundos...`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  return false;
};

module.exports = { connectDB, retryConnection }; 