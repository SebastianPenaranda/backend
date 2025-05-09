const nodemailer = require('nodemailer');

// Configuración del transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

// Función para obtener el contenido específico según el rol
const obtenerContenidoRol = (role) => {
    if (role === 'admin') {
        return {
            titulo: 'Administrador del Sistema',
            capacidades: [
                'Acceso completo al panel de administración',
                'Registro y gestión de nuevos usuarios',
                'Registro de personas en el sistema',
                'Visualización y gestión de todos los registros',
                'Acceso al historial completo de entradas y salidas',
                'Exportación de datos e informes',
                'Gestión de visitantes y accesos temporales'
            ],
            responsabilidades: [
                'Mantener la seguridad y confidencialidad de los datos',
                'Gestionar y actualizar la información de usuarios',
                'Supervisar y auditar los registros de acceso',
                'Asegurar el correcto funcionamiento del sistema',
                'Brindar soporte a los usuarios lectores',
                'Mantener actualizada la base de datos'
            ]
        };
    } else {
        return {
            titulo: 'Lector del Sistema',
            capacidades: [
                'Registro de entradas y salidas',
                'Verificación de identidad de usuarios',
                'Registro de visitantes',
                'Visualización de información básica de usuarios',
                'Gestión de accesos temporales'
            ],
            responsabilidades: [
                'Verificar la identidad de las personas que ingresan',
                'Mantener el control de acceso actualizado',
                'Registrar correctamente las entradas y salidas',
                'Gestionar apropiadamente el acceso de visitantes',
                'Reportar cualquier anomalía al administrador'
            ]
        };
    }
};

// Función para enviar correo de registro exitoso
const enviarCorreoRegistro = async (usuario, passwordOriginal) => {
    try {
        const contenidoRol = obtenerContenidoRol(usuario.role);
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: usuario.correoInstitucional,
            subject: `Registro Exitoso como ${contenidoRol.titulo} - Sistema de Control de Acceso`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <h1 style="color: #2c3e50; margin-bottom: 10px;">¡Bienvenido al Sistema de Control de Acceso!</h1>
                        <h2 style="color: #34495e; margin-bottom: 20px;">Registro como ${contenidoRol.titulo}</h2>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <p style="font-size: 16px;">Estimado(a) <strong>${usuario.nombre} ${usuario.apellido}</strong>,</p>
                        <p style="font-size: 16px;">Su registro en el sistema ha sido completado exitosamente.</p>
                    </div>

                    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                        <h3 style="color: #2c3e50; margin-bottom: 10px;">Detalles de su cuenta:</h3>
                        <ul style="list-style: none; padding-left: 0;">
                            <li style="margin-bottom: 8px;"><strong>Rol:</strong> ${usuario.rolUniversidad}</li>
                            <li style="margin-bottom: 8px;"><strong>ID Institucional:</strong> ${usuario.idInstitucional}</li>
                            <li style="margin-bottom: 8px;"><strong>Correo Institucional:</strong> ${usuario.correoInstitucional}</li>
                            <li style="margin-bottom: 8px;"><strong>Contraseña:</strong> ${passwordOriginal}</li>
                        </ul>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <h3 style="color: #2c3e50; margin-bottom: 10px;">Sus capacidades incluyen:</h3>
                        <ul style="color: #2c3e50;">
                            ${contenidoRol.capacidades.map(cap => `<li style="margin-bottom: 5px;">${cap}</li>`).join('')}
                        </ul>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <h3 style="color: #2c3e50; margin-bottom: 10px;">Sus responsabilidades son:</h3>
                        <ul style="color: #2c3e50;">
                            ${contenidoRol.responsabilidades.map(resp => `<li style="margin-bottom: 5px;">${resp}</li>`).join('')}
                        </ul>
                    </div>

                    <div style="background-color: #e8f4f8; padding: 15px; border-radius: 5px; margin-top: 20px;">
                        <p style="margin: 0; color: #2c3e50;">
                            <strong>Importante:</strong> Por seguridad, le recomendamos cambiar su contraseña después del primer inicio de sesión.
                        </p>
                    </div>

                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #7f8c8d; font-size: 12px; text-align: center;">
                        <p>Este es un correo automático del Sistema de Control de Acceso.</p>
                        <p>Por favor, no responda a este mensaje.</p>
                    </div>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('Error al enviar correo de registro:', error);
        return false;
    }
};

// Función para enviar correo de acceso
const enviarCorreoAcceso = async (acceso) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: acceso.correoInstitucional,
            subject: `Registro de ${acceso.tipo} - Sistema de Control de Acceso`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #2c3e50;">Registro de ${acceso.tipo}</h2>
                    <p>Se ha registrado su ${acceso.tipo} en el sistema.</p>
                    <p><strong>Detalles del acceso:</strong></p>
                    <ul>
                        <li>Nombre: ${acceso.nombre}</li>
                        <li>Fecha: ${acceso.fecha}</li>
                        <li>Hora: ${acceso.tipo === 'entrada' ? acceso.horaEntrada : acceso.horaSalida}</li>
                    </ul>
                    <p style="color: #7f8c8d; font-size: 12px;">Este es un correo automático, por favor no responda a este mensaje.</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('Error al enviar correo de acceso:', error);
        return false;
    }
};

// Función para enviar correo de recuperación de contraseña
const enviarCorreoRecuperacion = async (usuario, token) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: usuario.correoInstitucional,
            subject: 'Recuperación de Contraseña - Sistema de Control de Acceso',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #2c3e50;">Recuperación de Contraseña</h2>
                    <p>Estimado(a) ${usuario.nombre} ${usuario.apellido},</p>
                    <p>Hemos recibido una solicitud para restablecer su contraseña.</p>
                    <p>Su token de recuperación es: <strong>${token}</strong></p>
                    <p>Este token expirará en 1 hora.</p>
                    <p style="color: #7f8c8d; font-size: 12px;">Si no solicitó este cambio, por favor ignore este correo.</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('Error al enviar correo de recuperación:', error);
        return false;
    }
};

// Función para enviar correo de bienvenida a personas registradas
const enviarCorreoBienvenida = async (persona) => {
    try {
        const correoDestino = persona.tieneCorreoInstitucional === 'si' ? persona.correoInstitucional : persona.correoPersonal;
        const mailOptions = {
            from: `"Registro Unicatólica" <${process.env.EMAIL_USER}>`,
            to: correoDestino,
            subject: '¡Bienvenido/a a Unicatólica! Registro exitoso en el sistema de control de acceso',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <h1 style="color: #2c3e50; margin-bottom: 10px;">¡Bienvenido/a, ${persona.nombre} ${persona.apellido}!</h1>
                        <h2 style="color: #34495e; margin-bottom: 20px;">Fundación Universitaria Católica Lumen Gentium</h2>
                    </div>
                    <p style="font-size: 16px;">Nos complace informarte que tu registro en el sistema de control de acceso de Unicatólica ha sido realizado con éxito.</p>
                    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <h3 style="color: #2c3e50; margin-bottom: 10px;">Tus datos principales:</h3>
                        <ul style="list-style: none; padding-left: 0;">
                            <li><strong>Rol:</strong> ${persona.rolUniversidad}</li>
                            <li><strong>ID Institucional:</strong> ${persona.idInstitucional}</li>
                            <li><strong>Número de Carnet:</strong> ${persona.carnet}</li>
                            ${persona.carrera ? `<li><strong>Carrera:</strong> ${persona.carrera}</li>` : ''}
                            ${persona.semestre ? `<li><strong>Semestre:</strong> ${persona.semestre}</li>` : ''}
                            ${persona.departamento ? `<li><strong>Departamento:</strong> ${persona.departamento}</li>` : ''}
                            ${persona.cargo ? `<li><strong>Cargo:</strong> ${persona.cargo}</li>` : ''}
                        </ul>
                    </div>
                    <p style="font-size: 15px;">
                        Recuerda que tu carnet es personal e intransferible. Por favor, preséntalo siempre al ingresar y salir de la institución.<br>
                        Si tienes alguna duda o necesitas soporte, puedes comunicarte con nuestro equipo técnico a los números que aparecen en la aplicación o responder a este correo.
                    </p>
                    <div style="margin-top: 30px; text-align: center;">
                        <p style="color: #2c3e50; font-size: 16px;">
                            <strong>¡Te deseamos muchos éxitos en Unicatólica!</strong>
                        </p>
                    </div>
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #7f8c8d; font-size: 12px; text-align: center;">
                        <p>Este es un correo automático del sistema de control de acceso de Unicatólica.</p>
                        <p>Si recibiste este mensaje por error, por favor ignóralo.</p>
                    </div>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('Error al enviar correo de bienvenida:', error);
        return false;
    }
};

module.exports = {
    enviarCorreoRegistro,
    enviarCorreoAcceso,
    enviarCorreoRecuperacion,
    enviarCorreoBienvenida
}; 