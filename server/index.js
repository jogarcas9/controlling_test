// Cargar variables de entorno lo antes posible
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const http = require('http');

// Importar la conexión a la base de datos
const connectDB = require('./config/db');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Importar rutas
const authRoutes = require('./routes/api/auth');
const sharedSessionRoutes = require('./routes/api/shared-sessions');
const sessionRoutes = require('./routes/api/sessions');
const expenseRoutes = require('./routes/api/expenses');

require('./models/SharedSession');

// Verificar variables de entorno críticas
const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('Error: Variables de entorno requeridas no encontradas:');
  missingEnvVars.forEach(varName => {
    console.error(`- ${varName}`);
  });
  process.exit(1);
}

connectDB()
  .then(() => {
    console.log('Conexión a la base de datos establecida');
    
    // Rutas
    app.use('/api/auth', authRoutes);
    app.use('/api/shared-sessions', sharedSessionRoutes);
    app.use('/api/sessions', sessionRoutes);
    app.use('/api/expenses', expenseRoutes);

    // Servir archivos estáticos en producción
    if (process.env.NODE_ENV === 'production') {
      app.use(express.static(path.join(__dirname, '../client/build')));
      app.get('*', (req, res) => {
        res.sendFile(path.resolve(__dirname, '../client/build', 'index.html'));
      });
    }

    // Manejo de errores global
    app.use((err, req, res, next) => {
      console.error('Error en la aplicación:', err);
      res.status(500).json({
        status: 'error',
        message: err.message || 'Error interno del servidor'
      });
    });

    // Iniciar el servidor HTTP
    const PORT = process.env.PORT || 3000;
    const server = http.createServer(app);
    
    // Iniciar el servidor
    server.listen(PORT, () => {
      console.log(`Servidor iniciado en el puerto ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Error al conectar a la base de datos:', err);
    process.exit(1);
  }); 