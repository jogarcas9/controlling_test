const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const Expense = require('../../models/Expense');

// @route   GET api/personal-expenses/monthly
// @desc    Obtener gastos personales del mes actual
// @access  Private
router.get('/monthly', auth, async (req, res) => {
  try {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const expenses = await Expense.find({
      userId: req.user.id,
      type: 'personal',
      date: {
        $gte: firstDayOfMonth,
        $lte: lastDayOfMonth
      }
    }).sort({ date: -1 });

    res.json(expenses);
  } catch (err) {
    console.error('Error al obtener gastos mensuales:', err.message);
    res.status(500).send('Error del servidor');
  }
});

// @route   GET api/personal-expenses/generate-shared-month
// @desc    Generar resumen de gastos compartidos del mes
// @access  Private
router.get('/generate-shared-month', auth, async (req, res) => {
  try {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const expenses = await Expense.find({
      userId: req.user.id,
      type: 'shared',
      date: {
        $gte: firstDayOfMonth,
        $lte: lastDayOfMonth
      }
    }).sort({ date: -1 });

    // Aquí podrías agregar lógica adicional para procesar los gastos compartidos
    const summary = {
      total: expenses.reduce((sum, exp) => sum + exp.amount, 0),
      count: expenses.length,
      byCategory: expenses.reduce((acc, exp) => {
        acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
        return acc;
      }, {}),
      expenses
    };

    res.json(summary);
  } catch (err) {
    console.error('Error al generar resumen de gastos compartidos:', err.message);
    res.status(500).send('Error del servidor');
  }
});

// @route   GET api/personal-expenses
// @desc    Obtener gastos personales filtrados por mes y año
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { month, year } = req.query;
    console.log('Solicitud de gastos personales con filtros:', { month, year, userId: req.user.id });

    if (!month || !year) {
      return res.status(400).json({ msg: 'Se requieren los parámetros month y year' });
    }

    // Convertir los parámetros a números
    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    // Validar que son números válidos
    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12 || isNaN(yearNum)) {
      return res.status(400).json({ msg: 'Parámetros month y year deben ser números válidos' });
    }

    // Crear fechas de inicio y fin del mes
    const firstDayOfMonth = new Date(yearNum, monthNum - 1, 1);
    const lastDayOfMonth = new Date(yearNum, monthNum, 0);

    console.log('Buscando gastos entre:', firstDayOfMonth, 'y', lastDayOfMonth);

    // Buscar gastos en el rango de fechas
    const expenses = await Expense.find({
      userId: req.user.id,
      date: {
        $gte: firstDayOfMonth,
        $lte: lastDayOfMonth
      }
    }).sort({ date: -1 });

    console.log(`Se encontraron ${expenses.length} gastos para el período seleccionado`);
    res.json(expenses);
  } catch (err) {
    console.error('Error al obtener gastos filtrados:', err.message);
    res.status(500).json({ msg: 'Error del servidor', error: err.message });
  }
});

module.exports = router; 