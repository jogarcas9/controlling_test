require('dotenv').config();

// Configuración temporal de variables de entorno
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://jogarcas29:7JAw4tGRRjos9I8d@homeexpenses.acabyfv.mongodb.net/controlling_app';
process.env.PORT = process.env.PORT || 5000;
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'mysecretkey123';

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
    origin: [
      'http://localhost:3000',
      'http://localhost:5000',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5000',
      'https://controling.vercel.app',
      'https://controling-jogarcas9.vercel.app'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    credentials: true
  },
  // En Vercel, asegurar que el path es el correcto
  ...(isVercel ? { path: '/socket.io' } : {})
});

// Logging en todos los ambientes
app.use(morgan('combined'));

// Configuración optimizada de CORS
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5000',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5000',
  'https://controling.vercel.app',
  'https://controling-jogarcas9.vercel.app'
];

const corsOptions = {
  origin: function(origin, callback) {
    // En entorno de producción, aplicar restricciones de origen
    if (isProduction) {
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.log('Origin bloqueado por CORS:', origin);
        callback(new Error('Not allowed by CORS'));
      }
    } else {
      // En desarrollo, permitir cualquier origen
      callback(null, true);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'x-auth-token', 'Authorization'],
  credentials: true,
  maxAge: 600
};

app.use(cors(corsOptions));

// Aumentar límites de payload
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Configurar timeouts más largos para requests
app.use((req, res, next) => {
  req.setTimeout(30000);
  res.setTimeout(30000);
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

// Rutas de la API
app.use('/api/users', require('./routes/api/users'));
app.use('/api/auth', require('./routes/api/auth'));
app.use('/api/personal-expenses', require('./routes/api/personal-expenses'));
app.use('/api/income', require('./routes/api/income'));
app.use('/api/reports', require('./routes/api/reports'));
app.use('/api/shared-sessions', require('./routes/api/shared-sessions'));
app.use('/api/participant-allocations', require('./routes/api/participant-allocations'));

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

// Manejo de 404 SOLO para rutas de la API
app.use('/api', (req, res) => {
  console.log('404 Not Found:', req.path);
  res.status(404).json({ 
    message: 'Ruta no encontrada',
    path: req.path,
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
  // Para Vercel Serverless Functions
  module.exports = app;
} else {
  // Para desarrollo local o servidor convencional
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => console.log(`Servidor ejecutándose en el puerto ${PORT} (${isProduction ? 'producción' : 'desarrollo'})`));
}