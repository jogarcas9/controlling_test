const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config');

exports.registerUser = async (req, res) => {
  try {
    const { nombre, apellidos, email, password } = req.body;

    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ msg: 'El usuario ya existe' });
    }

    user = new User({
      nombre,
      apellidos,
      email,
      password
    });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    await user.save();

    const payload = {
      user: {
        id: user.id,
        email: user.email
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
            nombre: user.nombre,
            apellidos: user.apellidos,
            email: user.email
          }
        });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error del servidor');
  }
};

exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    let user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: 'Credenciales inválidas' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Credenciales inválidas' });
    }

    const payload = {
      user: {
        id: user.id,
        email: user.email
      }
    };

    jwt.sign(
      payload,
      config.jwtSecret,
      { expiresIn: '24h' },
      (err, token) => {
        if (err) throw err;
        console.log('Token generado correctamente');
        res.json({
          token,
          user: {
            id: user.id,
            nombre: user.nombre,
            apellidos: user.apellidos,
            email: user.email
          }
        });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error del servidor');
  }
}; 