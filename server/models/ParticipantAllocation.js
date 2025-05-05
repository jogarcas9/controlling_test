const mongoose = require('mongoose');

const participantAllocationSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SharedSession',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'EUR'
  },
  percentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'paid'],
    default: 'pending'
  },
  personalExpenseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PersonalExpense',
    default: null
  }
}, {
  timestamps: true
});

// Índices para mejorar la eficiencia de las consultas
participantAllocationSchema.index({ sessionId: 1, userId: 1 });
participantAllocationSchema.index({ userId: 1, status: 1 });
participantAllocationSchema.index({ personalExpenseId: 1 });

// Hook previo al guardado para registro
participantAllocationSchema.pre('save', function(next) {
  console.log(`Pre-guardado de asignación: ${this._id || 'nueva'}`);
  console.log(`Datos: userId=${this.userId}, sessionId=${this.sessionId}, amount=${this.amount}`);
  next();
});

// Hook para manejar la sincronización con gastos personales
// Este hook asegura que cuando se actualice o guarde una asignación,
// se actualice o cree el gasto personal correspondiente
participantAllocationSchema.post('save', async function(doc) {
  // No realizar sincronización si es una asignación recién creada por insertMany
  // ya que eso lo manejamos directamente en el servicio de asignaciones
  if (doc.isNew) {
    console.log(`Asignación nueva creada: ${doc._id}`);
    return;
  }

  console.log(`Post-guardado hook ejecutándose para asignación: ${doc._id}`);
  
  // Importamos el servicio de sincronización aquí para evitar dependencias circulares
  try {
    const syncService = require('../services/syncService');
    await syncService.syncAllocationToPersonalExpense(doc);
    console.log(`Sincronización post-guardado completada para asignación: ${doc._id}`);
  } catch (error) {
    console.error(`Error en hook post-save para asignación ${doc._id}:`, error);
    // No interrumpimos el flujo principal si hay un error en la sincronización
  }
});

// Hook para actualizar en cascada el gasto personal cuando se actualiza la asignación
participantAllocationSchema.post('findOneAndUpdate', async function(doc) {
  if (!doc) {
    console.log('No se encontró el documento en el hook post-update');
    return;
  }
  
  console.log(`Post-actualización hook ejecutándose para asignación: ${doc._id}`);
  
  try {
    const syncService = require('../services/syncService');
    await syncService.syncAllocationToPersonalExpense(doc);
    console.log(`Sincronización post-actualización completada para asignación: ${doc._id}`);
  } catch (error) {
    console.error(`Error en hook post-update para asignación ${doc._id}:`, error);
  }
});

const ParticipantAllocation = mongoose.model('ParticipantAllocation', participantAllocationSchema);

module.exports = ParticipantAllocation; 