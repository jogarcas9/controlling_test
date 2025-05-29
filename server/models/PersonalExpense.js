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
  // Campos explícitos para año y mes para facilitar búsquedas
  year: {
    type: Number,
    index: true
  },
  month: {
    type: Number,
    min: 0,
    max: 11,
    index: true
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
  // Nuevo campo para indicar si es un gasto por período
  isPeriodic: {
    type: Boolean,
    default: false
  },
  // Campos para el rango de fechas del gasto por período
  periodStartDate: {
    type: Date
  },
  periodEndDate: {
    type: Date
  },
  // Controla si este gasto proviene de una sesión compartida
  // y por lo tanto no debe ser editable ni eliminable desde la vista de gastos personales
  isFromSharedSession: {
    type: Boolean,
    default: false,
    index: true
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
    totalAmount: {
      type: Number,
      default: 0
    },
    year: Number,
    month: Number,
    participantName: String,
    isRecurringShare: {
      type: Boolean,
      default: false
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
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
personalExpenseSchema.index({ user: 1, year: 1, month: 1 });
personalExpenseSchema.index({ user: 1, isRecurring: 1 });
personalExpenseSchema.index({ user: 1, originalExpenseId: 1 });
personalExpenseSchema.index({ 'sessionReference.sessionId': 1, year: 1, month: 1 });
personalExpenseSchema.index({ isFromSharedSession: 1 });
personalExpenseSchema.index({ user: 1, isFromSharedSession: 1 });

// Nuevo índice para gastos por período
personalExpenseSchema.index({ isPeriodic: 1 });
personalExpenseSchema.index({ user: 1, isPeriodic: 1 });
personalExpenseSchema.index({ periodStartDate: 1, periodEndDate: 1 });

// Hook para validar los datos antes de guardar
personalExpenseSchema.pre('save', function(next) {
  // Registro de depuración para la creación de gastos
  console.log(`Guardando gasto personal: ${this._id || 'nuevo'}`);
  console.log(`Datos: usuario=${this.user}, monto=${this.amount}, categoria=${this.category}`);
  console.log('Estado del gasto periódico:', {
    isPeriodic: this.isPeriodic,
    periodStartDate: this.periodStartDate,
    periodEndDate: this.periodEndDate
  });
  
  // Asegurar que user es string
  if (this.user && typeof this.user !== 'string') {
    this.user = this.user.toString();
  }
  
  // Asegurar que los campos year y month están definidos según la fecha
  if (this.date && (!this.year || !this.month)) {
    const date = new Date(this.date);
    this.year = date.getFullYear();
    this.month = date.getMonth();
    console.log(`Estableciendo año=${this.year} y mes=${this.month} desde fecha=${this.date}`);
  }

  // Validaciones para gastos periódicos
  if (this.isPeriodic === true) {
    console.log('Validando gasto periódico...');
    
    // Asegurar que las fechas del período estén presentes
    if (!this.periodStartDate || !this.periodEndDate) {
      console.error('Error: Gasto periódico sin fechas de período');
      return next(new Error('Los gastos periódicos requieren fechas de inicio y fin'));
    }

    // Asegurar que las fechas son válidas
    const startDate = new Date(this.periodStartDate);
    const endDate = new Date(this.periodEndDate);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      console.error('Error: Fechas de período inválidas');
      return next(new Error('Las fechas del período no son válidas'));
    }

    // Asegurar que la fecha de inicio es anterior a la fecha de fin
    if (startDate > endDate) {
      console.error('Error: Fecha de inicio posterior a fecha de fin');
      return next(new Error('La fecha de inicio debe ser anterior a la fecha de fin'));
    }

    console.log('Validación de gasto periódico exitosa');
  }
  
  if (this.allocationId) {
    console.log(`Este gasto está vinculado a una asignación: ${this.allocationId}`);
    // Si tiene allocationId, asegurar que está marcado como proveniente de sesión compartida
    this.isFromSharedSession = true;
  }
  
  // Si es un gasto compartido, verificar que el nombre no tenga formato incorrecto
  if (this.isFromSharedSession === true) {
    // Verificar si el nombre contiene " - " seguido por un mes y año
    if (this.name && this.name.includes(' - ')) {
      console.log(`Corrigiendo nombre de gasto compartido: "${this.name}"`);
      // Simplificar el nombre para que sea solo la primera parte
      this.name = this.name.split(' - ')[0];
      console.log(`Nombre corregido: "${this.name}"`);
    }
    
    // Si tiene sessionReference, asegurar que el nombre coincide con el de la sesión
    if (this.sessionReference && this.sessionReference.sessionName) {
      if (this.name !== this.sessionReference.sessionName) {
        console.log(`Corrigiendo nombre para que coincida con la sesión: "${this.sessionReference.sessionName}"`);
        this.name = this.sessionReference.sessionName;
      }
    }
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
  // Ahora podemos usar los campos año y mes directamente
  return this.find({
    user: userId,
    year: year,
    month: month - 1 // El mes se guarda como 0-11, pero la función recibe 1-12
  }).sort({ date: -1 });
};

const PersonalExpense = mongoose.model('PersonalExpense', personalExpenseSchema);

module.exports = PersonalExpense; 