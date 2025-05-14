const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: false
  },
  last_name: {
    type: String,
    required: false
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  fecha: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  settings: {
    defaultCurrency: {
      type: String,
      default: 'EUR'
    },
    language: {
      type: String,
      default: 'es'
    },
    theme: {
      type: String,
      default: 'light'
    }
  }
});

// Método para encriptar contraseña antes de guardar
UserSchema.pre('save', async function(next) {
  // Si es un documento nuevo (no existe en la base de datos todavía)
  if (this.isNew) {
    // Asegurarse de que fecha tenga el mismo valor que createdAt
    this.fecha = this.createdAt || new Date();
  }

  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Método para comparar contraseñas
UserSchema.methods.matchPassword = async function(enteredPassword) {
  try {
    console.log('Intentando verificar contraseña para usuario:', this.email);
    const isMatch = await bcrypt.compare(enteredPassword, this.password);
    console.log('Resultado de verificación de contraseña:', isMatch ? 'Correcta' : 'Incorrecta');
    return isMatch;
  } catch (error) {
    console.error('Error al verificar contraseña:', error);
    return false;
  }
};

module.exports = mongoose.model('User', UserSchema); 