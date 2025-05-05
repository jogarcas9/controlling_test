const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../../config');
const auth = require('../../middleware/auth');
const User = require('../../models/User');

// @route   POST api/users/register
// @desc    Registrar un nuevo usuario
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, name, last_name } = req.body;

    // Validar campos requeridos
    if (!username || !email || !password) {
      return res.status(400).json({ msg: 'Por favor, complete todos los campos' });
    }

    // Verificar si el usuario ya existe
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ msg: 'El usuario ya existe' });
    }

    // Crear nuevo usuario
    user = new User({
      username,
      email,
      password,
      name,
      last_name
    });

    // Encriptar contraseña
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    // Guardar usuario
    await user.save();

    // Crear y devolver token JWT
    const payload = {
      user: {
        id: user.id
      }
    };

    jwt.sign(
      payload,
      config.jwtSecret,
      { expiresIn: '24h' },
      (err, token) => {
        if (err) throw err;
        res.json({ 
          token,
          user: {
            id: user.id,
            username: user.username,
            name: user.name,
            last_name: user.last_name,
            email: user.email
          }
        });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error del servidor');
  }
});

// @route   POST api/users/login
// @desc    Autenticar usuario y obtener token
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validar campos requeridos
    if (!email || !password) {
      return res.status(400).json({ msg: 'Por favor, complete todos los campos' });
    }

    // Verificar si el usuario existe
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: 'Credenciales inválidas' });
    }

    // Verificar contraseña
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Credenciales inválidas' });
    }

    // Crear y devolver token JWT
    const payload = {
      user: {
        id: user.id
      }
    };

    jwt.sign(
      payload,
      config.jwtSecret,
      { expiresIn: '24h' },
      (err, token) => {
        if (err) throw err;
        res.json({ 
          token,
          user: {
            id: user.id,
            username: user.username,
            name: user.name,
            last_name: user.last_name,
            email: user.email,
            settings: user.settings
          }
        });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error del servidor');
  }
});

// @route   GET api/users/me
// @desc    Obtener información del usuario actual
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error del servidor');
  }
});

// @route   PUT api/users/me
// @desc    Actualizar información del usuario
// @access  Private
router.put('/me', auth, async (req, res) => {
  try {
    const { username, email, currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);

    if (username) user.username = username;
    if (email) user.email = email;

    // Si se proporciona una nueva contraseña, verificar la actual y actualizar
    if (currentPassword && newPassword) {
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ msg: 'Contraseña actual incorrecta' });
      }

      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
    }

    await user.save();
    res.json({ msg: 'Usuario actualizado correctamente' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error del servidor');
  }
});

module.exports = router; 