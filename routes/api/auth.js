const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../../config');
const auth = require('../../middleware/auth');
const User = require('../../models/User');

// @route   GET /api/auth
// @desc    Prueba de autenticación 
// @access  Public
router.get('/', (req, res) => {
  res.json({
    msg: 'Auth API funcionando',
    timestamp: new Date().toISOString()
  });
});

// @route   POST /api/auth/login
// @desc    Autenticar usuario y obtener token
// @access  Public
router.post('/login', async (req, res) => {
  try {
    console.log('Intento de login recibido:', req.body.email);
    
    // Verificar si el cuerpo de la solicitud contiene datos
    if (!req.body || Object.keys(req.body).length === 0) {
      console.error('Error: Cuerpo de la solicitud vacío');
      return res.status(400).json({ msg: 'Datos de inicio de sesión no proporcionados' });
    }
    
    const { email, password } = req.body;

    // Validar campos requeridos
    if (!email || !password) {
      return res.status(400).json({ msg: 'Por favor, complete todos los campos' });
    }

    // Verificar si el usuario existe
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      console.log('Usuario no encontrado:', email);
      return res.status(400).json({ msg: 'Credenciales inválidas' });
    }

    // Verificar contraseña - evitar llamar a matchPassword múltiples veces
    try {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        console.log('Contraseña incorrecta para:', email);
        return res.status(400).json({ msg: 'Credenciales inválidas' });
      }
    } catch (err) {
      console.error('Error al verificar contraseña:', err);
      return res.status(500).json({ msg: 'Error al verificar credenciales' });
    }

    // Crear y devolver token JWT
    const payload = {
      user: {
        id: user.id,
        email: user.email,
        username: user.username
      }
    };

    const token = jwt.sign(
      payload,
      config.jwtSecret,
      { expiresIn: '24h' }
    );
    
    console.log('Login exitoso. Token generado para:', email);
    console.log('Token ejemplo:', token.substring(0, 20) + '...');
    
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        last_name: user.last_name,
        settings: user.settings
      }
    });
  } catch (err) {
    console.error('Error en login:', err.message);
    res.status(500).send('Error del servidor');
  }
});

// @route   GET /api/auth/user
// @desc    Obtener información del usuario autenticado
// @access  Private
router.get('/user', (req, res) => {
  // Para pruebas, devolvemos un usuario fijo
  res.json({
    id: '123456',
    name: 'Usuario Prueba',
    email: 'test@example.com'
  });
});

module.exports = router; 