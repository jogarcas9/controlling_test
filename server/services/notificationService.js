const { User } = require('../models');

class NotificationService {
  /**
   * Notifica a los participantes sobre cambios en las asignaciones
   * @param {Array} allocations - Lista de asignaciones actualizadas
   * @param {string} changeType - Tipo de cambio ('expense_added', 'expense_updated', 'expense_deleted', 'percentage_changed')
   */
  async notifyAllocationChanges(allocations, changeType) {
    const userIds = [...new Set(allocations.map(a => a.userId.toString()))];
    const users = await User.find({ _id: { $in: userIds } });

    const notifications = users.map(user => {
      const userAllocations = allocations.filter(a => 
        a.userId.toString() === user._id.toString()
      );

      return this._createNotificationMessage(user, userAllocations, changeType);
    });

    return notifications;
  }

  /**
   * Crea un mensaje de notificación para un usuario específico
   */
  _createNotificationMessage(user, allocations, changeType) {
    if (!allocations.length) return null;

    const allocation = allocations[0];
    const sessionName = allocation.sessionName;
    let message;

    switch (changeType) {
      case 'expense_added':
        message = this._createExpenseAddedMessage(allocations);
        break;
      case 'expense_updated':
        message = this._createExpenseUpdatedMessage(allocations);
        break;
      case 'expense_deleted':
        message = this._createExpenseDeletedMessage(allocations);
        break;
      case 'percentage_changed':
        message = this._createPercentageChangedMessage(allocations);
        break;
      default:
        message = this._createDefaultMessage(allocations);
    }

    return {
      userId: user._id,
      sessionName,
      message,
      type: changeType
    };
  }

  /**
   * Crea el mensaje para un nuevo gasto
   */
  _createExpenseAddedMessage(allocations) {
    const allocation = allocations[0];
    return `
Se ha añadido un nuevo gasto en la sesión ${allocation.sessionName}.

Detalles de tu participación:
- Porcentaje: ${allocation.percentage}%
- Tu parte: ${allocation.amount} ${allocation.currency}
- Total del gasto: ${allocation.totalAmount} ${allocation.currency}
    `.trim();
  }

  /**
   * Crea el mensaje para un gasto actualizado
   */
  _createExpenseUpdatedMessage(allocations) {
    const allocation = allocations[0];
    return `
Se ha actualizado un gasto en la sesión ${allocation.sessionName}.

Detalles actualizados de tu participación:
- Porcentaje: ${allocation.percentage}%
- Tu parte: ${allocation.amount} ${allocation.currency}
- Total del gasto: ${allocation.totalAmount} ${allocation.currency}
    `.trim();
  }

  /**
   * Crea el mensaje para un gasto eliminado
   */
  _createExpenseDeletedMessage(allocations) {
    const allocation = allocations[0];
    return `
Se ha eliminado un gasto en la sesión ${allocation.sessionName}.

Tus asignaciones han sido actualizadas:
- Porcentaje: ${allocation.percentage}%
- Tu parte actual: ${allocation.amount} ${allocation.currency}
- Total actual: ${allocation.totalAmount} ${allocation.currency}
    `.trim();
  }

  /**
   * Crea el mensaje para un cambio en los porcentajes
   */
  _createPercentageChangedMessage(allocations) {
    const allocation = allocations[0];
    return `
Se han modificado los porcentajes de participación en la sesión ${allocation.sessionName}.

Tu nueva participación:
- Nuevo porcentaje: ${allocation.percentage}%
- Tu parte actual: ${allocation.amount} ${allocation.currency}
- Total: ${allocation.totalAmount} ${allocation.currency}
    `.trim();
  }

  /**
   * Crea un mensaje por defecto
   */
  _createDefaultMessage(allocations) {
    const allocation = allocations[0];
    return `
Se han realizado cambios en la sesión ${allocation.sessionName}.

Estado actual de tu participación:
- Porcentaje: ${allocation.percentage}%
- Tu parte: ${allocation.amount} ${allocation.currency}
- Total: ${allocation.totalAmount} ${allocation.currency}
    `.trim();
  }
}

module.exports = new NotificationService(); 