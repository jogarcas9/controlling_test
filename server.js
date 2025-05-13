require('dotenv').config();

// Configuración temporal de variables de entorno
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://jogarcas29:7JAw4tGRRjos9I8d@homeexpenses.acabyfv.mongodb.net/controlling_app';
process.env.PORT = process.env.PORT || 5000;
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'xJ3!k9$mP2#nQ7@vR4*tL8%wY5&zU6';

const express = require('express');
const cors = require('cors');
const path = require('path');
const morgan = require('morgan');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { connectDB, retryConnection } = require('./config/mongodb');
const http = require('http');
const socketIo = require('socket.io');
const config = require('./config');

// Determinar si estamos en producción
const isProduction = process.env.NODE_ENV === 'production';
const isVercel = process.env.VERCEL === '1';

// Crear la aplicación Express
const app = express();

// Configurar servidor HTTP
const server = http.createServer(app);

// Configurar Socket.IO
const io = socketIo(server, {
  cors: {
    origin: '*', // Permitir cualquier origen
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    credentials: true
  },
  // En Vercel, asegurar que el path es el correcto
  ...(isVercel ? { path: '/socket.io' } : {})
});

// Logging en todos los ambientes
app.use(morgan('combined'));

// Configuración simple de CORS - permitir todo en desarrollo
app.use(cors({
  origin: '*', // Permitir cualquier origen en producción para debugging
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'x-auth-token', 'Authorization'],
  credentials: false, // Cambiar a false para evitar problemas de CORS
  maxAge: 600
}));

// Aumentar límites de payload
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Configurar timeouts más largos para requests
app.use((req, res, next) => {
  req.setTimeout(60000); // 60 segundos
  res.setTimeout(60000); // 60 segundos
  next();
});

// Middlewares
app.use(helmet({
  contentSecurityPolicy: false // Desactivar CSP para permitir WebSockets
}));
app.use(compression());

// Inicializar base de datos con reintentos
const initializeDatabase = async () => {
  try {
    console.log('Iniciando conexión a MongoDB Atlas...');
    
    // Intentar conexión con reintentos
    const isConnected = await retryConnection();
    
    if (!isConnected) {
      throw new Error('No se pudo establecer conexión después de varios intentos');
    }
    
    console.log('Base de datos inicializada correctamente');
  } catch (error) {
    console.error('Error al inicializar la base de datos:', error);
    if (!isVercel) {
      process.exit(1);
    }
  }
};

// Inicializar base de datos
initializeDatabase();

// Configurar Socket.IO para manejar las conexiones
io.on('connection', (socket) => {
  console.log('Nuevo cliente conectado', socket.id);
  
  // Autenticar usuario
  socket.on('authenticate', (token) => {
    try {
      // Aquí podrías verificar el token si es necesario
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      if (decoded && decoded.user && decoded.user.id) {
        socket.userId = decoded.user.id;
        console.log('Cliente autenticado', socket.id, 'User ID:', socket.userId);
        
        // Unir al usuario a una sala basada en su ID
        socket.join(`user-${socket.userId}`);
      }
    } catch (error) {
      console.error('Error de autenticación de Socket.IO:', error.message);
    }
  });
  
  // Manejar desconexiones
  socket.on('disconnect', () => {
    console.log('Cliente desconectado', socket.id);
  });
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  const dbStatus = await connectDB();
  res.json({ 
    status: 'ok', 
    environment: process.env.NODE_ENV,
    database: dbStatus ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
    socketio: io ? 'available' : 'unavailable'
  });
});

// Ruta básica para verificar que el servidor está funcionando
app.get('/', (req, res) => {
  res.json({
    message: 'Servidor Controling funcionando correctamente',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Ruta para prueba de autenticación
app.get('/api/test', (req, res) => {
  res.json({
    message: 'API funcionando correctamente',
    auth: 'No autenticado',
    timestamp: new Date().toISOString()
  });
});

// Rutas de la API - Comentar las que no existan en el proyecto actual
try {
  if (require('./routes/api/auth')) {
    app.use('/api/auth', require('./routes/api/auth'));
  }
} catch (e) {
  console.log('Ruta /api/auth no disponible:', e.message);
}

try {
  if (require('./routes/api/users')) {
    app.use('/api/users', require('./routes/api/users'));
  }
} catch (e) {
  console.log('Ruta /api/users no disponible:', e.message);
}

try {
  if (require('./routes/api/personal-expenses')) {
    app.use('/api/personal-expenses', require('./routes/api/personal-expenses'));
  }
} catch (e) {
  console.log('Ruta /api/personal-expenses no disponible:', e.message);
}

try {
  if (require('./routes/api/income')) {
    app.use('/api/income', require('./routes/api/income'));
  }
} catch (e) {
  console.log('Ruta /api/income no disponible:', e.message);
}

try {
  if (require('./routes/api/reports')) {
    app.use('/api/reports', require('./routes/api/reports'));
  }
} catch (e) {
  console.log('Ruta /api/reports no disponible:', e.message);
}

try {
  if (require('./routes/api/shared-sessions')) {
    app.use('/api/shared-sessions', require('./routes/api/shared-sessions'));
  }
} catch (e) {
  console.log('Ruta /api/shared-sessions no disponible:', e.message);
}

try {
  if (require('./routes/api/participant-allocations')) {
    app.use('/api/participant-allocations', require('./routes/api/participant-allocations'));
  }
} catch (e) {
  console.log('Ruta /api/participant-allocations no disponible:', e.message);
}

// Middleware para manejo de errores mejorado
app.use((err, req, res, next) => {
  console.error('[ERROR]', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    query: req.query
  });
  
  res.status(500).json({ 
    msg: 'Error en el servidor',
    error: err.message,
    path: req.path
  });
});

// Manejo de 404 para todas las rutas
app.use('*', (req, res) => {
  console.log('404 Not Found:', req.originalUrl);
  res.status(404).json({ 
    message: 'Ruta no encontrada',
    path: req.originalUrl,
    method: req.method
  });
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // límite de 100 peticiones por ventana
});
app.use(limiter);

// Exportar io para que pueda ser utilizado en otros lugares
app.set('io', io);

// Si estamos en el entorno de Vercel, exportamos la app
// Si no, iniciamos el servidor
if (isVercel) {
  // Para Vercel Serverless Functions - exportar server y app para mayor compatibilidad
  module.exports = app;
  module.exports.app = app;
  module.exports.server = server;
  
  // Log específico para Vercel
  console.log('Servidor listo para Vercel Serverless Functions');
} else {
  // Para desarrollo local o servidor convencional
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => console.log(`Servidor ejecutándose en el puerto ${PORT} (${isProduction ? 'producción' : 'desarrollo'})`));
} 