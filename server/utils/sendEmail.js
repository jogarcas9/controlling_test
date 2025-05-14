const nodemailer = require('nodemailer');

/**
 * Función para enviar correos electrónicos
 * @param {Object} options - Opciones para el correo
 * @param {string} options.to - Destinatario del correo
 * @param {string} options.subject - Asunto del correo
 * @param {string} options.text - Contenido del correo en texto plano
 * @param {string} options.html - Contenido del correo en HTML (opcional)
 * @returns {Promise} - Promesa con el resultado del envío
 */
const sendEmail = async (options) => {
  // Crear un transporter
  const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });

  // Opciones del correo
  const mailOptions = {
    from: `${process.env.EMAIL_FROM_NAME || 'Controlling App'} <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html
  };

  // Enviar el correo
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Correo enviado: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('Error al enviar correo:', error);
    throw error;
  }
};

module.exports = sendEmail; 