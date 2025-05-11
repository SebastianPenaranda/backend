const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.office365.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  },
  tls: {
    ciphers: 'SSLv3'
  }
});

const getRoleSpecificContent = (role) => {
  const content = {
    'Estudiante': {
      derechos: [
        'Acceso a la plataforma educativa',
        'Consulta de calificaciones',
        'Acceso a recursos académicos',
        'Participación en actividades estudiantiles'
      ],
      responsabilidades: [
        'Mantener un buen rendimiento académico',
        'Cumplir con las fechas de entrega',
        'Participar activamente en clases',
        'Respetar el código de ética estudiantil'
      ]
    },
    'Profesor / Docente': {
      derechos: [
        'Acceso al panel de administración',
        'Gestión de calificaciones',
        'Acceso a recursos docentes',
        'Programación de actividades académicas'
      ],
      responsabilidades: [
        'Actualizar calificaciones',
        'Gestionar contenido académico',
        'Responder consultas estudiantiles',
        'Cumplir con el calendario académico'
      ]
    },
    'Personal Administrativo': {
      derechos: [
        'Acceso al panel administrativo',
        'Gestión de registros',
        'Acceso a reportes institucionales'
      ],
      responsabilidades: [
        'Mantener actualizada la información',
        'Gestionar trámites administrativos',
        'Proporcionar soporte a usuarios'
      ]
    },
    'Egresado': {
      derechos: [
        'Acceso a la plataforma de egresados',
        'Consulta de certificados',
        'Acceso a oportunidades laborales'
      ],
      responsabilidades: [
        'Mantener datos actualizados',
        'Participar en actividades de egresados'
      ]
    },
    'Personal de Servicios': {
      derechos: [
        'Acceso a la plataforma',
        'Consulta de información relevante'
      ],
      responsabilidades: [
        'Cumplir con sus funciones asignadas',
        'Mantener la confidencialidad'
      ]
    },
    'Becario / Pasante': {
      derechos: [
        'Acceso a recursos asignados',
        'Participación en actividades específicas'
      ],
      responsabilidades: [
        'Cumplir con el programa de becas',
        'Mantener un buen rendimiento'
      ]
    },
    'Colaborador Externo': {
      derechos: [
        'Acceso a recursos específicos',
        'Participación en proyectos asignados'
      ],
      responsabilidades: [
        'Cumplir con los términos del convenio',
        'Mantener la confidencialidad'
      ]
    }
  };

  return content[role] || {
    derechos: ['Acceso básico a la plataforma'],
    responsabilidades: ['Cumplir con las políticas institucionales']
  };
};

const sendWelcomeEmail = async (email, role, password) => {
  const roleContent = getRoleSpecificContent(role);
  const isInstitutionalEmail = email.endsWith('@unicatolica.edu.co');
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Bienvenido a Unicatólica - Registro Exitoso',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">¡Bienvenido a Unicatólica!</h2>
        <p>Hola,</p>
        <p>Tu registro ha sido exitoso. A continuación encontrarás tus credenciales de acceso y la información relevante para tu rol.</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #2c3e50;">Tus credenciales de acceso:</h3>
          <p><strong>Correo:</strong> ${email}</p>
          <p><strong>Contraseña:</strong> ${password}</p>
          <p><em>Por favor, cambia tu contraseña después de iniciar sesión por primera vez.</em></p>
        </div>

        ${!isInstitutionalEmail ? `
        <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #856404;">Nota Importante:</h3>
          <p>Estás recibiendo este correo en tu dirección de correo personal porque no tienes un correo institucional asignado. 
          Por favor, asegúrate de mantener actualizada tu información de contacto en la plataforma.</p>
        </div>
        ` : ''}

        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #2c3e50;">Derechos como ${role}:</h3>
          <ul>
            ${roleContent.derechos.map(derecho => `<li>${derecho}</li>`).join('')}
          </ul>
        </div>

        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #2c3e50;">Responsabilidades como ${role}:</h3>
          <ul>
            ${roleContent.responsabilidades.map(responsabilidad => `<li>${responsabilidad}</li>`).join('')}
          </ul>
        </div>

        <p>Para acceder a la plataforma, visita: <a href="${process.env.FRONTEND_URL}">${process.env.FRONTEND_URL}</a></p>
        
        <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
        
        <p>Saludos,<br>Equipo Unicatólica</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error al enviar el correo de bienvenida:', error);
    return false;
  }
};

const sendPasswordResetEmail = async (email, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Recuperación de Contraseña - Unicatólica',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Recuperación de Contraseña</h2>
        <p>Hola,</p>
        <p>Has solicitado restablecer tu contraseña. Por favor, haz clic en el siguiente enlace para crear una nueva contraseña:</p>
        <p>
          <a href="${resetUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Restablecer Contraseña
          </a>
        </p>
        <p>Si no solicitaste este cambio, por favor ignora este correo.</p>
        <p>Este enlace expirará en 1 hora por razones de seguridad.</p>
        <p>Saludos,<br>Equipo Unicatólica</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error al enviar el correo:', error);
    return false;
  }
};

module.exports = {
  sendPasswordResetEmail,
  sendWelcomeEmail
}; 