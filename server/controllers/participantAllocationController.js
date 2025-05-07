const ParticipantAllocation = require('../models/ParticipantAllocation');
const SharedSession = require('../models/SharedSession');
const mongoose = require('mongoose');

/**
 * Obtener todas las asignaciones del usuario actual
 */
exports.getUserAllocations = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const allocations = await ParticipantAllocation.find({ userId })
      .populate('sessionId', 'name description')
      .sort({ year: -1, month: -1 })
      .limit(100);
    
    res.json(allocations);
  } catch (error) {
    console.error('Error al obtener asignaciones del usuario:', error);
    res.status(500).json({ msg: 'Error del servidor' });
  }
};

/**
 * Obtener las asignaciones por año y mes para el usuario actual
 */
exports.getUserAllocationsByYearMonth = async (req, res) => {
  try {
    const userId = req.user.id;
    const { year, month } = req.params;
    
    // Validar parámetros
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);
    
    if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 0 || monthNum > 11) {
      return res.status(400).json({ msg: 'Año o mes no válido' });
    }
    
    const allocations = await ParticipantAllocation.find({ 
      userId, 
      year: yearNum,
      month: monthNum
    })
      .populate('sessionId', 'name description')
      .sort({ createdAt: -1 });
    
    res.json(allocations);
  } catch (error) {
    console.error('Error al obtener asignaciones por año/mes:', error);
    res.status(500).json({ msg: 'Error del servidor' });
  }
};

/**
 * Obtener las asignaciones de una sesión específica
 */
exports.getSessionAllocations = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;
    
    // Verificar que el usuario tiene acceso a esta sesión
    const session = await SharedSession.findOne({
      _id: sessionId,
      $or: [
        { userId }, // Es el creador
        { 'participants.userId': userId, 'participants.status': 'accepted' } // Es participante aceptado
      ]
    });
    
    if (!session) {
      return res.status(403).json({ msg: 'No tiene permiso para ver esta sesión' });
    }
    
    const allocations = await ParticipantAllocation.find({ sessionId })
      .populate('userId', 'nombre email')
      .sort({ year: -1, month: -1, userId: 1 });
    
    res.json(allocations);
  } catch (error) {
    console.error('Error al obtener asignaciones de la sesión:', error);
    res.status(500).json({ msg: 'Error del servidor' });
  }
};

/**
 * Obtener las asignaciones de una sesión por año y mes
 */
exports.getSessionAllocationsByYearMonth = async (req, res) => {
  try {
    const { sessionId, year, month } = req.params;
    const userId = req.user.id;
    
    // Validar parámetros
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);
    
    if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 0 || monthNum > 11) {
      return res.status(400).json({ msg: 'Año o mes no válido' });
    }
    
    // Verificar que el usuario tiene acceso a esta sesión
    const session = await SharedSession.findOne({
      _id: sessionId,
      $or: [
        { userId }, // Es el creador
        { 'participants.userId': userId, 'participants.status': 'accepted' } // Es participante aceptado
      ]
    });
    
    if (!session) {
      return res.status(403).json({ msg: 'No tiene permiso para ver esta sesión' });
    }
    
    const allocations = await ParticipantAllocation.find({ 
      sessionId,
      year: yearNum,
      month: monthNum
    })
      .populate('userId', 'nombre email')
      .sort({ userId: 1 });
    
    res.json(allocations);
  } catch (error) {
    console.error('Error al obtener asignaciones por año/mes de la sesión:', error);
    res.status(500).json({ msg: 'Error del servidor' });
  }
};

/**
 * Actualizar el estado de una asignación
 */
exports.updateAllocationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.id;
    
    // Validar estado
    if (!['pending', 'accepted', 'paid'].includes(status)) {
      return res.status(400).json({ msg: 'Estado no válido' });
    }
    
    // Verificar que la asignación pertenece al usuario
    const allocation = await ParticipantAllocation.findOne({
      _id: id,
      userId
    });
    
    if (!allocation) {
      return res.status(404).json({ msg: 'Asignación no encontrada' });
    }
    
    // Actualizar estado
    allocation.status = status;
    allocation.updatedAt = new Date();
    await allocation.save();
    
    res.json(allocation);
  } catch (error) {
    console.error('Error al actualizar estado de asignación:', error);
    res.status(500).json({ msg: 'Error del servidor' });
  }
};

/**
 * Eliminar una asignación (solo disponible para administradores)
 */
exports.deleteAllocation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Obtener la asignación
    const allocation = await ParticipantAllocation.findById(id);
    
    if (!allocation) {
      return res.status(404).json({ msg: 'Asignación no encontrada' });
    }
    
    // Verificar que el usuario es administrador de la sesión
    const session = await SharedSession.findOne({
      _id: allocation.sessionId,
      userId // Solo el creador puede eliminar asignaciones
    });
    
    if (!session) {
      return res.status(403).json({ msg: 'No tiene permiso para eliminar esta asignación' });
    }
    
    // Eliminar la asignación
    await ParticipantAllocation.findByIdAndDelete(id);
    
    res.json({ msg: 'Asignación eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar asignación:', error);
    res.status(500).json({ msg: 'Error del servidor' });
  }
}; 