const jwt = require('jsonwebtoken');
const config = require('../config');

module.exports = function(req, res, next) {
  // Obtener token del header
  const token = req.header('x-auth-token') || req.header('Authorization')?.replace('Bearer ', '');

  // Verificar si no hay token
  if (!token) {
    console.log('Acceso denegado: No se proporcionó token');
    return res.status(401).json({ msg: 'No hay token, autorización denegada' });
  }

  try {
    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || config.jwtSecret);
    
    // Añadir el usuario desde el payload del token al request
    req.user = decoded.user;
    next();
  } catch (err) {
    console.error('Token inválido:', err.message);
    res.status(401).json({ msg: 'Token no válido' });
  }
}; 