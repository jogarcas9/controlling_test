const nodemailer = require('nodemailer');

// Configuración del transporter de nodemailer
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Función para enviar emails
exports.sendEmail = async ({ to, subject, text, html }) => {
  try {
    // Verificar que tenemos las credenciales necesarias
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn('Credenciales SMTP no configuradas. Email no enviado.');
      return;
    }

    const mailOptions = {
      from: process.env.SMTP_FROM || '"Controling App" <noreply@controling.app>',
      to,
      subject,
      text,
      html: html || text // Si no se proporciona HTML, usar el texto plano
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email enviado:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error al enviar email:', error);
    throw error;
  }
}; 