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
  }
}, {
  timestamps: true
});

// Índices para mejorar la eficiencia de las consultas
participantAllocationSchema.index({ sessionId: 1, userId: 1 });
participantAllocationSchema.index({ userId: 1, status: 1 });

const ParticipantAllocation = mongoose.model('ParticipantAllocation', participantAllocationSchema);

module.exports = ParticipantAllocation; 