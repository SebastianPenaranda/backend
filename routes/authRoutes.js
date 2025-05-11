const express = require('express');
const router = express.Router();
const { register, forgotPassword, resetPassword } = require('../controllers/authController');

// Ruta de registro
router.post('/register', register);

// Rutas de recuperación de contraseña
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

module.exports = router; 