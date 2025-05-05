const mongoose = require('mongoose');

const personalExpenseSchema = new mongoose.Schema({
  user: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: '',
    trim: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'EUR',
    trim: true
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  type: {
    type: String,
    enum: ['expense', 'income'],
    default: 'expense'
  },
  paymentMethod: {
    type: String,
    trim: true
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringDay: {
    type: Number
  },
  originalExpenseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PersonalExpense',
    default: null
  },
  tags: [{
    type: String,
    trim: true
  }],
  notes: {
    type: String,
    trim: true
  },
  sessionReference: {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SharedSession'
    },
    sessionName: String,
    percentage: Number,
    isRecurringShare: {
      type: Boolean,
      default: false
    }
  },
  allocationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ParticipantAllocation',
    default: null
  }
}, {
  timestamps: true
});

// Índices
personalExpenseSchema.index({ user: 1 });
personalExpenseSchema.index({ date: 1 });
personalExpenseSchema.index({ category: 1 });
personalExpenseSchema.index({ type: 1 });
personalExpenseSchema.index({ isRecurring: 1 });
personalExpenseSchema.index({ 'sessionReference.sessionId': 1 });
personalExpenseSchema.index({ allocationId: 1 });
personalExpenseSchema.index({ originalExpenseId: 1 });
personalExpenseSchema.index({ user: 1, date: 1 });
personalExpenseSchema.index({ user: 1, isRecurring: 1 });
personalExpenseSchema.index({ user: 1, originalExpenseId: 1 });

// Hook para validar los datos antes de guardar
personalExpenseSchema.pre('save', function(next) {
  // Registro de depuración para la creación de gastos
  console.log(`Guardando gasto personal: ${this._id || 'nuevo'}`);
  console.log(`Datos: usuario=${this.user}, monto=${this.amount}, categoria=${this.category}`);
  
  // Asegurar que user es string
  if (this.user && typeof this.user !== 'string') {
    this.user = this.user.toString();
  }
  
  if (this.allocationId) {
    console.log(`Este gasto está vinculado a una asignación: ${this.allocationId}`);
  }
  
  // Verificación adicional de datos válidos
  if (!this.user) {
    return next(new Error('El usuario es obligatorio'));
  }
  
  if (!this.amount || isNaN(this.amount) || this.amount < 0) {
    return next(new Error('El monto debe ser un número positivo'));
  }
  
  if (!this.name || this.name.trim() === '') {
    return next(new Error('El nombre del gasto es obligatorio'));
  }
  
  if (!this.category || this.category.trim() === '') {
    return next(new Error('La categoría es obligatoria'));
  }
  
  next();
});

// Método estático para buscar gastos por usuario y mes
personalExpenseSchema.statics.findByUserAndMonth = async function(userId, year, month) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);
  
  return this.find({
    user: userId,
    date: {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ date: -1 });
};

const PersonalExpense = mongoose.model('PersonalExpense', personalExpenseSchema);

module.exports = PersonalExpense; 