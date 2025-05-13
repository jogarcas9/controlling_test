const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../../config');
const auth = require('../../middleware/auth');
const User = require('../../models/User');

// @route   POST api/auth/login
// @desc    Autenticar usuario y obtener token
// @access  Public
router.post('/login', async (req, res) => {
  try {
    console.log('Intento de login recibido. Headers:', req.headers);
    console.log('Cuerpo de la solicitud:', req.body);
    
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

    console.log('Buscando usuario con email:', email.toLowerCase());
    
    // Verificar si el usuario existe
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      console.log('Usuario no encontrado:', email);
      return res.status(400).json({ msg: 'Credenciales inválidas' });
    }

    console.log('Usuario encontrado, verificando contraseña...');
    
    // Verificar contraseña directamente con bcrypt
    try {
      const isMatch = await bcrypt.compare(password, user.password);
      console.log('Resultado de verificación de contraseña:', isMatch ? 'Correcta' : 'Incorrecta');
      
      if (!isMatch) {
        console.log('Contraseña incorrecta para:', email);
        return res.status(400).json({ msg: 'Credenciales inválidas' });
      }
    } catch (err) {
      console.error('Error al verificar contraseña:', err);
      return res.status(500).json({ msg: 'Error al verificar credenciales' });
    }

    console.log('Contraseña correcta, generando token...');
    
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
      { expiresIn: '7d' }  // Aumentado a 7 días para evitar expiración frecuente
    );
    
    console.log('Login exitoso. Token generado para:', email);
    console.log('Token ejemplo:', token.substring(0, 20) + '...');
    
    // Retornar respuesta exitosa
    return res.json({
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
    console.error('Error en login:', err.message, err.stack);
    return res.status(500).json({ 
      msg: 'Error del servidor',
      error: err.message,
      stack: process.env.NODE_ENV === 'production' ? null : err.stack
    });
  }
});

// @route   GET api/auth/user
// @desc    Obtener información del usuario autenticado
// @access  Private
router.get('/user', auth, async (req, res) => {
  try {
    console.log('Solicitud de datos de usuario:', req.user.id);
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ msg: 'Usuario no encontrado' });
    }
    console.log('Datos de usuario enviados correctamente');
    res.json(user);
  } catch (err) {
    console.error('Error al obtener usuario:', err.message);
    res.status(500).send('Error del servidor');
  }
});

// @route   POST api/auth/verify-token
// @desc    Verificar si el token es válido
// @access  Private
router.post('/verify-token', auth, (req, res) => {
  res.json({ valid: true });
});

// @route   POST api/auth/logout
// @desc    Cerrar sesión (invalidar token en el cliente)
// @access  Private
router.post('/logout', auth, (req, res) => {
  // En el backend no necesitamos hacer nada especial
  // El cliente debe eliminar el token
  res.json({ msg: 'Sesión cerrada correctamente' });
});

// @route   POST api/auth/reset-password
// @desc    Solicitar restablecimiento de contraseña
// @access  Public
router.post('/reset-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ msg: 'Por favor, proporcione un email' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ msg: 'Usuario no encontrado' });
    }

    // Aquí normalmente enviarías un email con un enlace para restablecer la contraseña
    // Por ahora solo enviamos una respuesta exitosa
    res.json({ msg: 'Si existe una cuenta con ese email, recibirá instrucciones para restablecer su contraseña' });
  } catch (err) {
    console.error('Error al solicitar reset de contraseña:', err.message);
    res.status(500).send('Error del servidor');
  }
});

// @route   GET api/auth/verify
// @desc    Verificar token
// @access  Public
router.get('/verify', async (req, res) => {
  try {
    const authHeader = req.header('Authorization');
    console.log('Verificando token. Auth Header:', authHeader ? 'Presente' : 'Ausente');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('Header de autorización inválido o faltante en verificación');
      return res.status(401).json({ 
        msg: 'No hay token o formato inválido', 
        valid: false 
      });
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('Token extraído en verificación:', token.substring(0, 20) + '...');

    try {
      const decoded = jwt.verify(token, config.jwtSecret);
      console.log('Token verificado correctamente:', decoded.user.id);
      
      const user = await User.findById(decoded.user.id).select('-password');
      if (!user) {
        console.log('Usuario no encontrado en verificación de token');
        return res.status(401).json({ 
          msg: 'Usuario no encontrado', 
          valid: false 
        });
      }

      console.log('Verificación de token exitosa para:', user.email);
      res.json({ 
        valid: true, 
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
      console.error('Error al verificar token en endpoint verify:', err);
      return res.status(401).json({ 
        msg: 'Token inválido', 
        valid: false,
        error: err.message 
      });
    }
  } catch (err) {
    console.error('Error general en verificación de token:', err);
    res.status(500).json({ 
      msg: 'Error del servidor', 
      valid: false,
      error: err.message
    });
  }
});

// @route   GET api/auth
// @desc    Redireccionar a /api/auth/user para compatibilidad
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    console.log('Petición a /api/auth detectada. Redirigiendo a /api/auth/user');
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    console.error('Error al redireccionar:', err);
    res.status(500).send('Error del servidor');
  }
});

// @route   POST api/auth/register
// @desc    Registrar un nuevo usuario
// @access  Public
router.post('/register', async (req, res) => {
  try {
    console.log('Intento de registro recibido:', req.body.email);
    const { username, email, password, name, last_name } = req.body;

    // Validar campos requeridos
    if (!username || !email || !password) {
      return res.status(400).json({ msg: 'Por favor, complete todos los campos obligatorios' });
    }

    // Verificar si el usuario ya existe
    let user = await User.findOne({ email: email.toLowerCase() });
    if (user) {
      console.log('Usuario ya existe:', email);
      return res.status(400).json({ msg: 'El usuario ya existe' });
    }

    // Crear nuevo usuario
    user = new User({
      username,
      email: email.toLowerCase(),
      password,
      name,
      last_name
    });

    // La encriptación de la contraseña se hace en el middleware pre-save del modelo

    // Guardar usuario
    await user.save();
    console.log('Usuario registrado correctamente:', email);

    // Crear y devolver token JWT
    const payload = {
      user: {
        id: user.id,
        email: user.email,
        username: user.username
      }
    };

    jwt.sign(
      payload,
      config.jwtSecret,
      { expiresIn: '24h' },
      (err, token) => {
        if (err) {
          console.error('Error al generar token:', err);
          throw err;
        }
        console.log('Token generado para nuevo usuario:', email);
        console.log('Token ejemplo:', token.substring(0, 20) + '...');
        
        res.status(201).json({
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            name: user.name,
            last_name: user.last_name
          }
        });
      }
    );
  } catch (err) {
    console.error('Error en registro:', err.message);
    res.status(500).send('Error del servidor');
  }
});

module.exports = router; 