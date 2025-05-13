const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/User');

module.exports = async (req, res, next) => {
  try {
    console.log('Auth middleware - Request headers:', req.headers);
    
    // Comprobar si hay headers de Authorization
    const authHeader = req.header('Authorization');
    console.log('Auth middleware - Authorization header:', authHeader ? `${authHeader.substring(0, 20)}...` : 'No hay header');
    
    // También verificar x-auth-token para compatibilidad con sistemas legacy
    const legacyToken = req.header('x-auth-token');
    if (legacyToken) {
      console.log('Auth middleware - Usando header legacy x-auth-token');
    }
    
    // Si no hay Authorization header pero hay x-auth-token, usarlo
    const token = authHeader 
      ? authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : authHeader
      : legacyToken;

    if (!token) {
      console.log('Auth middleware - No se encontró token en los headers');
      return res.status(401).json({ 
        msg: 'No hay token o formato inválido, autorización denegada',
        details: 'El token debe enviarse en el header Authorization con el formato: Bearer <token>'
      });
    }

    console.log('Auth middleware - Token encontrado, verificando...');

    try {
      // Verificar token
      const decoded = jwt.verify(token, config.jwtSecret);
      console.log('Auth middleware - Token verificado para usuario:', decoded.user ? decoded.user.id : 'No user ID');
      
      // Validar datos del usuario
      if (!decoded.user || !decoded.user.id) {
        console.log('Auth middleware - Token sin información de usuario válida');
        return res.status(401).json({ 
          msg: 'Token inválido - datos de usuario faltantes',
          details: 'El token no contiene la información necesaria del usuario'
        });
      }

      console.log('Auth middleware - Buscando usuario en DB con ID:', decoded.user.id);
      
      // Buscar el usuario en la base de datos
      const user = await User.findById(decoded.user.id).select('-password');
      
      if (!user) {
        console.log('Auth middleware - Usuario no encontrado:', decoded.user.id);
        return res.status(401).json({ 
          msg: 'Token válido pero usuario no encontrado',
          details: 'El usuario asociado al token ya no existe en la base de datos'
        });
      }

      console.log('Auth middleware - Usuario encontrado en DB:', user.email);
      
      // Añadir el usuario a la request
      req.user = {
        id: user._id.toString(),
        email: user.email.toLowerCase(),
        username: user.username || '',
        settings: user.settings || {}
      };
      console.log('Auth middleware - Usuario autenticado exitosamente:', req.user.email);

      next();
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        console.error('Auth middleware - Token expirado:', err.message);
        return res.status(401).json({ 
          msg: 'Token expirado',
          details: 'El token proporcionado ha expirado, por favor inicie sesión nuevamente',
          expired: true
        });
      }
      
      console.error('Auth middleware - Error al verificar token:', err.message);
      return res.status(401).json({ 
        msg: 'Token no válido',
        details: 'El token proporcionado no es válido'
      });
    }
  } catch (error) {
    console.error('Auth middleware - Error general:', error.message, error.stack);
    return res.status(500).json({ 
      msg: 'Error del servidor al procesar la autenticación',
      details: error.message
    });
  }
}; 