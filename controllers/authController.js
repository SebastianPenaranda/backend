const User = require('../models/User');
const { sendPasswordResetEmail, sendWelcomeEmail } = require('../config/emailConfig');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// Función para registrar un nuevo usuario
const register = async (req, res) => {
  try {
    const { 
      nombre, 
      apellido, 
      fechaNacimiento, 
      idInstitucional, 
      cedula, 
      rolUniversidad, 
      correoPersonal, 
      correoInstitucional, 
      password, 
      role 
    } = req.body;

    if (!nombre || !apellido || !fechaNacimiento || !idInstitucional || !cedula || 
        !rolUniversidad || !correoPersonal || !password || !role) {
      return res.status(400).json({ error: "❌ Faltan datos" });
    }

    if (role !== "admin" && role !== "lector") {
      return res.status(400).json({ error: "❌ Rol inválido" });
    }

    // Verificar si ya existe un usuario con la misma cédula y rol
    const existingUser = await User.findOne({
      $or: [
        { cedula: cedula, role: role },
        { correoPersonal: correoPersonal, role: role },
        { correoInstitucional: correoInstitucional, role: role }
      ]
    });

    if (existingUser) {
      if (existingUser.cedula === cedula && existingUser.role === role) {
        return res.status(400).json({ error: `❌ Ya existe un usuario con esta cédula como ${role}` });
      }
      if (existingUser.correoPersonal === correoPersonal && existingUser.role === role) {
        return res.status(400).json({ error: `❌ Ya existe un usuario con este correo personal como ${role}` });
      }
      if (existingUser.correoInstitucional === correoInstitucional && existingUser.role === role) {
        return res.status(400).json({ error: `❌ Ya existe un usuario con este correo institucional como ${role}` });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ 
      nombre,
      apellido,
      fechaNacimiento,
      idInstitucional,
      cedula,
      rolUniversidad,
      correoPersonal,
      correoInstitucional: correoInstitucional || null, // Permitir que sea null
      password: hashedPassword,
      role
    });
    await newUser.save();

    // Enviar correo de bienvenida al correo correspondiente
    const emailToSend = correoInstitucional || correoPersonal;
    const emailSent = await sendWelcomeEmail(emailToSend, rolUniversidad, password);
    if (!emailSent) {
      console.error('Error al enviar el correo de bienvenida');
    }

    res.json({ message: "✅ Usuario registrado correctamente" });
  } catch (error) {
    console.error("Error en el registro:", error);
    if (error.code === 11000) {
      return res.status(400).json({ error: `❌ Ya existe un usuario con estos datos como ${req.body.role}` });
    }
    res.status(500).json({ error: "❌ Error en el registro" });
  }
};

// Función para solicitar recuperación de contraseña
const forgotPassword = async (req, res) => {
  try {
    const { correoInstitucional } = req.body;

    // Buscar usuario por correo
    const user = await User.findOne({ correoInstitucional });
    if (!user) {
      return res.status(404).json({ error: 'No se encontró ningún usuario con ese correo electrónico' });
    }

    // Generar token de restablecimiento
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = Date.now() + 3600000; // 1 hora

    // Guardar token en la base de datos
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpiry;
    await user.save();

    // Enviar correo electrónico
    const emailSent = await sendPasswordResetEmail(correoInstitucional, resetToken);
    
    if (!emailSent) {
      return res.status(500).json({ error: 'Error al enviar el correo electrónico' });
    }

    res.json({ success: true, message: 'Se ha enviado un correo con las instrucciones' });
  } catch (error) {
    console.error('Error en forgotPassword:', error);
    res.status(500).json({ error: 'Error al procesar la solicitud' });
  }
};

// Función para restablecer la contraseña
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    // Buscar usuario con el token válido
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ error: 'Token inválido o expirado' });
    }

    // Encriptar nueva contraseña
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    // Limpiar tokens de restablecimiento
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    res.json({ success: true, message: 'Contraseña actualizada exitosamente' });
  } catch (error) {
    console.error('Error en resetPassword:', error);
    res.status(500).json({ error: 'Error al restablecer la contraseña' });
  }
};

module.exports = {
  register,
  forgotPassword,
  resetPassword
}; 