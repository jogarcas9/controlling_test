const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const Expense = require('../../models/Expense');

// @route   GET api/reports
// @desc    Ruta base de reportes
// @access  Private
router.get('/', auth, (req, res) => {
  res.json({ msg: 'Ruta de reportes' });
});

// @route   GET api/reports/summary
// @desc    Obtener resumen general de finanzas
// @access  Private
router.get('/summary', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Obtener el mes actual
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    
    // Calcular rango de fechas para el mes actual
    const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth, 0);
    
    // Obtener gastos del mes
    const expenses = await Expense.find({
      userId,
      date: {
        $gte: firstDayOfMonth,
        $lte: lastDayOfMonth
      }
    });
    
    // Calcular totales y estadísticas
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    
    res.json({
      success: true,
      data: {
        totalExpenses,
        month: currentMonth,
        year: currentYear,
        expenseCount: expenses.length
      }
    });
  } catch (err) {
    console.error('Error al generar resumen general:', err.message);
    res.status(500).json({ msg: 'Error del servidor', error: err.message });
  }
});

// @route   GET api/reports/monthly-summary
// @desc    Obtener reporte mensual
// @access  Private
router.get('/monthly-summary', auth, async (req, res) => {
  try {
    const { month, year } = req.query;
    const userId = req.user.id;
    
    console.log(`Generando reporte mensual para: ${month}/${year} - Usuario: ${userId}`);
    
    if (!month || !year) {
      return res.status(400).json({ 
        msg: 'Se requieren los parámetros month y year',
        success: false
      });
    }
    
    // Convertir parámetros a números
    const monthNum = parseInt(month);
    const yearNum = parseInt(year);
    
    // Validar parámetros
    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12 || isNaN(yearNum)) {
      return res.status(400).json({ 
        msg: 'Los parámetros month y year deben ser números válidos',
        success: false
      });
    }
    
    // Calcular rango de fechas
    const firstDayOfMonth = new Date(yearNum, monthNum - 1, 1);
    const lastDayOfMonth = new Date(yearNum, monthNum, 0);
    
    // Obtener gastos del mes
    const expenses = await Expense.find({
      userId,
      date: {
        $gte: firstDayOfMonth,
        $lte: lastDayOfMonth
      }
    }).sort({ date: -1 });
    
    // Calcular totales por categoría
    const byCategory = expenses.reduce((acc, exp) => {
      const category = exp.category || 'Sin categoría';
      acc[category] = (acc[category] || 0) + exp.amount;
      return acc;
    }, {});
    
    // Calcular total general
    const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    
    console.log(`Reporte generado: ${expenses.length} gastos encontrados`);
    
    res.json({
      success: true,
      data: {
        month: monthNum,
        year: yearNum,
        total,
        count: expenses.length,
        byCategory,
        expenses: expenses.map(exp => ({
          id: exp._id,
          name: exp.name,
          amount: exp.amount,
          category: exp.category,
          date: exp.date
        }))
      }
    });
  } catch (err) {
    console.error('Error al generar reporte mensual:', err.message);
    res.status(500).json({ 
      msg: 'Error del servidor', 
      error: err.message,
      success: false
    });
  }
});

// @route   GET api/reports/yearly-summary
// @desc    Obtener reporte anual
// @access  Private
router.get('/yearly-summary', auth, async (req, res) => {
  try {
    const { year } = req.query;
    const userId = req.user.id;
    
    console.log(`Generando reporte anual para: ${year} - Usuario: ${userId}`);
    
    if (!year) {
      return res.status(400).json({ 
        msg: 'Se requiere el parámetro year',
        success: false
      });
    }
    
    // Convertir parámetro a número
    const yearNum = parseInt(year);
    
    // Validar parámetro
    if (isNaN(yearNum)) {
      return res.status(400).json({ 
        msg: 'El parámetro year debe ser un número válido',
        success: false
      });
    }
    
    // Calcular rango de fechas para el año
    const firstDayOfYear = new Date(yearNum, 0, 1);
    const lastDayOfYear = new Date(yearNum, 11, 31, 23, 59, 59);
    
    // Obtener gastos del año
    const expenses = await Expense.find({
      userId,
      date: {
        $gte: firstDayOfYear,
        $lte: lastDayOfYear
      }
    });
    
    // Calcular totales por mes
    const monthlyTotals = Array(12).fill(0);
    expenses.forEach(exp => {
      const month = new Date(exp.date).getMonth();
      monthlyTotals[month] += exp.amount;
    });
    
    // Calcular total anual
    const annualTotal = monthlyTotals.reduce((sum, amount) => sum + amount, 0);
    
    console.log(`Reporte anual generado: ${expenses.length} gastos encontrados`);
    
    res.json({
      success: true,
      data: {
        year: yearNum,
        annualTotal,
        count: expenses.length,
        monthlyTotals,
        monthlyAverages: monthlyTotals.map(total => total > 0 ? total / expenses.length : 0)
      }
    });
  } catch (err) {
    console.error('Error al generar reporte anual:', err.message);
    res.status(500).json({ 
      msg: 'Error del servidor', 
      error: err.message,
      success: false
    });
  }
});

module.exports = router; 