// Parte corregida para syncToPersonal
exports.syncToPersonal = async (req, res) => {
  try {
    const sessionId = req.params.id;
    const userId = req.user.id;

    console.log(`Solicitando sincronización de gastos para sesión ${sessionId} por usuario ${userId}`);
    
    // Buscar la sesión con todos los datos necesarios
    const session = await SharedSession.findOne({
      _id: sessionId,
      $or: [
        { userId: userId },
        { 'participants.userId': userId }
      ]
    });
    
    if (!session) {
      console.log(`Sesión ${sessionId} no encontrada o no autorizada para usuario ${userId}`);
      return res.status(404).json({ 
        msg: 'Sesión no encontrada',
        details: 'La sesión especificada no existe o no tienes acceso a ella'
      });
    }

    // Iniciar una transacción para asegurar consistencia
    const mongoSession = await mongoose.startSession();
    mongoSession.startTransaction();

    try {
      console.log(`Iniciando sincronización para sesión ${session.name} (${session._id})`);
      
      // Calcular el monto total de todos los gastos en la sesión
      const totalAmount = session.expenses?.reduce((sum, expense) => sum + expense.amount, 0) || 0;
      console.log(`Monto total de gastos en la sesión: ${totalAmount}`);

      // Estadísticas para el resultado
      const syncStats = {
        processed: 0,
        created: 0,
        updated: 0,
        skipped: 0
      };

      // Si no hay gastos, no hay nada que sincronizar
      if (totalAmount <= 0) {
        console.log('No hay gastos para sincronizar');
        syncStats.skipped = session.participants?.length || 0;
        
        await mongoSession.commitTransaction();
        return res.json({
          msg: 'Sincronización completada - No hay gastos para sincronizar',
          sync: syncStats
        });
      }

      // Resto del código igual...
    }
    // Resto del código igual...
  }
}; 