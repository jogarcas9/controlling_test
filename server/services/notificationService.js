const { User } = require('../models');
const sendEmail = require('../utils/sendEmail');

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

      return this._sendUserNotification(user, userAllocations, changeType);
    });

    await Promise.all(notifications);
  }

  /**
   * Envía una notificación a un usuario específico
   */
  async _sendUserNotification(user, allocations, changeType) {
    if (!allocations.length) return;

    const sessionName = allocations[0].sessionName;
    let subject, message;

    switch (changeType) {
      case 'expense_added':
        subject = `Nuevo gasto en ${sessionName}`;
        message = this._createExpenseAddedMessage(allocations);
        break;
      case 'expense_updated':
        subject = `Actualización de gasto en ${sessionName}`;
        message = this._createExpenseUpdatedMessage(allocations);
        break;
      case 'expense_deleted':
        subject = `Eliminación de gasto en ${sessionName}`;
        message = this._createExpenseDeletedMessage(allocations);
        break;
      case 'percentage_changed':
        subject = `Cambio en porcentajes de ${sessionName}`;
        message = this._createPercentageChangedMessage(allocations);
        break;
      default:
        subject = `Actualización en ${sessionName}`;
        message = this._createDefaultMessage(allocations);
    }

    try {
      await sendEmail({
        to: user.email,
        subject,
        text: message
      });
    } catch (error) {
      console.error(`Error enviando notificación a ${user.email}:`, error);
    }
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

Puedes revisar los detalles en la aplicación.
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

Puedes revisar los cambios en la aplicación.
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

Puedes revisar los cambios en la aplicación.
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

Puedes revisar los cambios en la aplicación.
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

Puedes revisar los detalles en la aplicación.
    `.trim();
  }
}

module.exports = new NotificationService(); 