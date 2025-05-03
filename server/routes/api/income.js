const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const Income = require('../../models/Income');

// @route   GET api/income/monthly
// @desc    Obtener ingresos del mes actual
// @access  Private
router.get('/monthly', auth, async (req, res) => {
  try {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const monthlyIncome = await Income.find({
      userId: req.user.id,
      date: {
        $gte: firstDayOfMonth,
        $lte: lastDayOfMonth
      }
    }).sort({ date: -1 });

    res.json(monthlyIncome);
  } catch (err) {
    console.error('Error al obtener ingresos mensuales:', err.message);
    res.status(500).send('Error del servidor');
  }
});

// @route   POST api/income
// @desc    Crear un nuevo ingreso
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const { description, amount, category, date, isRecurring, recurringPeriod, source, notes } = req.body;

    const newIncome = new Income({
      userId: req.user.id,
      description,
      amount,
      category,
      date: date || Date.now(),
      isRecurring,
      recurringPeriod,
      source,
      notes
    });

    const income = await newIncome.save();
    res.json(income);
  } catch (err) {
    console.error('Error al crear ingreso:', err.message);
    res.status(500).send('Error del servidor');
  }
});

// @route   GET api/income
// @desc    Obtener todos los ingresos del usuario
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const income = await Income.find({ userId: req.user.id }).sort({ date: -1 });
    res.json(income);
  } catch (err) {
    console.error('Error al obtener ingresos:', err.message);
    res.status(500).send('Error del servidor');
  }
});

// @route   DELETE api/income/:id
// @desc    Eliminar un ingreso
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const income = await Income.findById(req.params.id);

    if (!income) {
      return res.status(404).json({ msg: 'Ingreso no encontrado' });
    }

    // Verificar usuario
    if (income.userId.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Usuario no autorizado' });
    }

    await income.remove();
    res.json({ msg: 'Ingreso eliminado' });
  } catch (err) {
    console.error('Error al eliminar ingreso:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Ingreso no encontrado' });
    }
    res.status(500).send('Error del servidor');
  }
});

module.exports = router; 