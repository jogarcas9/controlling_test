const express = require('express');
const cors = require('cors');
const { connectDB } = require('./config/mongodb');
const authRoutes = require('./routes/api/auth');
const usersRoutes = require('./routes/api/users');
const personalExpensesRoutes = require('./routes/api/personal-expenses');
const incomeRoutes = require('./routes/api/income');
const sharedSessionsRoutes = require('./routes/api/shared-sessions');
const reportsRoutes = require('./routes/api/reports');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/personal-expenses', personalExpensesRoutes);
app.use('/api/income', incomeRoutes);
app.use('/api/shared-sessions', sharedSessionsRoutes);
app.use('/api/reports', reportsRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: err.message || 'Error interno del servidor'
  });
});

module.exports = app; 