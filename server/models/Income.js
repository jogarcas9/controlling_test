const mongoose = require('mongoose');

const incomeSchema = new mongoose.Schema({
  description: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringPeriod: {
    type: String
  },
  source: {
    type: String,
    required: true
  },
  notes: {
    type: String
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Índices
incomeSchema.index({ userId: 1 });
incomeSchema.index({ date: 1 });
incomeSchema.index({ category: 1 });

const Income = mongoose.model('Income', incomeSchema);

module.exports = Income; 