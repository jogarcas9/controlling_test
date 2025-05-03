// Cargar variables de entorno lo antes posible
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const http = require('http');
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');

// Importar la conexión a la base de datos
const connectDB = require('./config/db');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Importar modelos
require('./models/User');
require('./models/Session');
require('./models/Expense');
require('./models/SharedSession');

// Importar rutas
const authRoutes = require('./routes/auth');
const sessionRoutes = require('./routes/sessions');
const expenseRoutes = require('./routes/expenses');
const sharedSessionRoutes = require('./routes/api/shared-sessions');

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

// Conectar a la base de datos
console.log('Iniciando conexión a la base de datos...');
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
    
    // Configurar el servidor WebSocket
    const wss = new WebSocket.Server({ 
      server,
      path: '/ws'
    });
    
    // Mantener un registro de conexiones por usuario
    const clients = new Map();
    
    wss.on('connection', async (ws, req) => {
      console.log('Nueva conexión WebSocket establecida');
      let userId = null;
      
      // Función para verificar token y obtener userId
      const verifyToken = async (token) => {
        try {
          if (!token) return null;
          
          // Verificar el token
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          return decoded.user.id;
        } catch (error) {
          console.error('Error en la verificación del token:', error);
          return null;
        }
      };
      
      ws.on('message', async (message) => {
        try {
          console.log('Mensaje recibido:', message);
          const data = JSON.parse(message);
          
          // Si el mensaje es de autenticación
          if (data.type === 'auth') {
            // Verificar el token y obtener el ID de usuario
            userId = await verifyToken(data.token);
            
            if (userId) {
              // Registrar la conexión para este usuario
              if (!clients.has(userId)) {
                clients.set(userId, []);
              }
              clients.get(userId).push(ws);
              
              console.log(`Usuario ${userId} autenticado en WebSocket`);
            } else {
              ws.send(JSON.stringify({
                type: 'error',
                message: 'Autenticación fallida'
              }));
            }
          }
          
          // Manejar otros tipos de mensajes según sea necesario
        } catch (error) {
          console.error('Error al procesar mensaje WebSocket:', error);
        }
      });
      
      ws.on('close', () => {
        console.log('Conexión WebSocket cerrada');
        
        // Eliminar la conexión del registro
        if (userId) {
          const userConnections = clients.get(userId) || [];
          const index = userConnections.indexOf(ws);
          
          if (index !== -1) {
            userConnections.splice(index, 1);
          }
          
          if (userConnections.length === 0) {
            clients.delete(userId);
          }
        }
      });
      
      // Enviar un mensaje de bienvenida
      ws.send(JSON.stringify({ type: 'welcome', message: 'Conexión WebSocket establecida correctamente' }));
    });
    
    // Iniciar el servidor
    server.listen(PORT, () => {
      console.log(`Servidor iniciado en el puerto ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Error al conectar a la base de datos:', err);
    process.exit(1);
  }); 