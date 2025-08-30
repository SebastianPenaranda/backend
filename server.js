require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const xlsx = require('xlsx');
const { enviarCorreoRecuperacion } = require("./mailer");

const app = express();
app.use(cors({
  origin: ['https://frontend-jade-nine-61.vercel.app', 'http://localhost:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());

// Conexión a MongoDB
mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/registro-huellas", {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log("✅ MongoDB conectado"))
.catch(err => console.log("❌ Error en MongoDB:", err));

// Configuración de almacenamiento en memoria para Multer
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // Limita el tamaño del archivo a 10MB
});

// Esquema para guardar archivos en la base de datos
const fileSchema = new mongoose.Schema({
  name: String,
  data: Buffer,
  contentType: String,
});
const File = mongoose.model("File", fileSchema);

// Ruta para subir el archivo
app.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).send("No file uploaded.");
  }

  // Guardar el archivo en la base de datos
  const newFile = new File({
    name: req.file.originalname,
    data: req.file.buffer,
    contentType: req.file.mimetype,
  });

  try {
    await newFile.save();
    res.send({
      message: "File uploaded and saved to database successfully!",
      fileId: newFile._id,
    });
  } catch (err) {
    res.status(500).send("Error saving file to database.");
  }
});

// Esquema de Usuarios
const UserSchema = new mongoose.Schema({
  nombre: String,
  apellido: String,
  fechaNacimiento: String,
  idInstitucional: String,
  cedula: String,
  rolUniversidad: String,
  correoPersonal: String,
  correoInstitucional: String,
  password: String,
  role: String,
  __v: Number,
  resetPasswordToken: String, // Campo para token de recuperación
  resetPasswordExpires: Date  // Campo para expiración del token
});

// Índice compuesto para permitir duplicados de cédula/correo con diferente rol
UserSchema.index({ cedula: 1, role: 1 }, { unique: true });
UserSchema.index({ correoPersonal: 1, role: 1 }, { unique: true });
UserSchema.index({ correoInstitucional: 1, role: 1 }, { unique: true });

let User;
try {
  User = mongoose.model("User", UserSchema, "users");
} catch (e) {
  // Si no existe el modelo, mostrar advertencia
  console.warn("El modelo User.js no existe. Debes crearlo en backend/models/User.js");
}

// Esquema de Huellas
const HuellaSchema = new mongoose.Schema({
  nombre: String,
  apellido: String,
  fechaNacimiento: String,
  idInstitucional: String,
  cedula: String,
  rolUniversidad: String,
  correoPersonal: String,
  tieneCorreoInstitucional: String,
  correoInstitucional: String,
  fecha: String,
  hora: String,
  imagen: Buffer,
  imagenMimeType: String,
  carnet: String,
  // Campos dinámicos
  // Estudiante
  carrera: String,
  semestre: String,
  tipoMatricula: String,
  programa: String,
  perteneceSemillero: String,
  nombreSemillero: String,
  tieneProyectoActivo: String,
  nombreProyecto: String,
  
  // Profesor
  departamento: String,
  categoriaAcademica: String,
  horarioAtencion: String,
  
  // Personal Administrativo
  dependencia: String,
  cargo: String,
  telefonoInterno: String,
  turnoLaboral: String,
  
  // Egresado
  anioGraduacion: String,
  programaGrado: String,
  tituloObtenido: String,
  correoEgresado: String,
  
  // Personal de Servicios
  area: String,
  turno: String,
  numeroEmpleado: String,
  
  // Becario / Pasante
  programaBeca: String,
  fechaInicioBeca: String,
  fechaFinBeca: String,
  dependenciaAsignada: String,

  // Visitante
  razonVisita: String,
  numeroTarjeta: String,
  fechaExpiracion: Date
});
const Huella = mongoose.model("Huella", HuellaSchema);



// Esquema de Accesos (Entradas y Salidas)
const AccesoSchema = new mongoose.Schema({
  personaId: mongoose.Schema.Types.ObjectId,
  nombre: String,
  rolUniversidad: String,
  carnet: String,
  numeroTarjeta: String,
  fecha: String, // YYYY-MM-DD
  horaEntrada: String, // HH:mm:ss
  horaSalida: String  // HH:mm:ss
});
const Acceso = mongoose.model("Acceso", AccesoSchema);

// Función para eliminar visitantes expirados
const eliminarVisitantesExpirados = async () => {
  try {
    const fechaActual = new Date();
    await Huella.deleteMany({
      rolUniversidad: "Visitante",
      fechaExpiracion: { $lt: fechaActual }
    });
  } catch (error) {
    console.error("Error al eliminar visitantes expirados:", error);
  }
};

// Ejecutar la limpieza cada día
setInterval(eliminarVisitantesExpirados, 24 * 60 * 60 * 1000);

// Ruta para registrar visitante
app.post("/api/registrar-visitante", async (req, res) => {
  try {
    const { nombre, apellido, cedula, razonVisita, numeroTarjeta } = req.body;

    if (!nombre || !apellido || !cedula || !razonVisita || !numeroTarjeta) {
      return res.status(400).json({ error: "❌ Faltan datos requeridos" });
    }

    // Calcular fecha de expiración (1 mes desde hoy)
    const fechaExpiracion = new Date();
    fechaExpiracion.setMonth(fechaExpiracion.getMonth() + 1);

    const visitante = new Huella({
      nombre,
      apellido,
      cedula,
      razonVisita,
      numeroTarjeta,
      rolUniversidad: "Visitante",
      fechaExpiracion,
      fecha: new Date().toISOString().split('T')[0],
      hora: new Date().toTimeString().split(' ')[0]
    });

    await visitante.save();
    res.status(200).json({ message: "✅ Visitante registrado exitosamente" });
  } catch (error) {
    console.error("Error al registrar visitante:", error);
    res.status(500).json({ error: "❌ Error al registrar visitante" });
  }
});

// 📌 Ruta para registrar usuarios
app.post("/api/register", async (req, res) => {
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
        !rolUniversidad || !correoPersonal || !correoInstitucional || !password || !role) {
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
      correoInstitucional,
      password: hashedPassword,
      role
    });
    await newUser.save();
    res.json({ message: "✅ Usuario registrado correctamente" });
  } catch (error) {
    console.error("Error en el registro:", error);
    if (error.code === 11000) {
      return res.status(400).json({ error: `❌ Ya existe un usuario con estos datos como ${req.body.role}` });
    }
    res.status(500).json({ error: "❌ Error en el registro" });
  }
});

// 📌 Ruta para obtener todos los usuarios
app.get("/api/usuarios", async (req, res) => {
  try {
    const usuarios = await User.find().select('-password'); // Excluir la contraseña de la respuesta
    res.json(usuarios);
  } catch (error) {
    console.error("Error al obtener usuarios:", error);
    res.status(500).json({ error: "❌ Error al obtener los usuarios" });
  }
});

// 📌 Ruta para obtener usuarios por rol
app.get("/api/usuarios/:role", async (req, res) => {
  try {
    const { role } = req.params;
    if (role !== "admin" && role !== "lector") {
      return res.status(400).json({ error: "❌ Rol inválido" });
    }
    const usuarios = await User.find({ role }).select('-password');
    res.json(usuarios);
  } catch (error) {
    console.error("Error al obtener usuarios por rol:", error);
    res.status(500).json({ error: "❌ Error al obtener los usuarios" });
  }
});

// 📌 Ruta para iniciar sesión
app.post("/api/login", async (req, res) => {
  try {
    console.log("Datos de login recibidos:", req.body);
    const { correoInstitucional, password, role } = req.body;
    
    if (!correoInstitucional || !password || !role) {
      return res.status(400).json({ error: "❌ Faltan datos para iniciar sesión" });
    }

    // Buscar usuario por correo institucional y rol
    const user = await User.findOne({ 
      correoInstitucional: correoInstitucional,
      role: role 
    });

    console.log("Usuario encontrado:", user);

    if (!user) {
      return res.status(401).json({ error: "❌ Usuario no encontrado" });
    }

    // Verificar la contraseña usando bcrypt
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "❌ Contraseña incorrecta" });
    }

    res.json({ 
      message: "✅ Inicio de sesión exitoso",
      role: user.role,
      nombre: user.nombre,
      apellido: user.apellido
    });
  } catch (error) {
    console.error("Error en el inicio de sesión:", error);
    res.status(500).json({ error: "❌ Error en el inicio de sesión" });
  }
});

// 📌 Ruta para guardar datos en MongoDB (con imagen)
app.post("/api/save", upload.single("imagen"), async (req, res) => {
  try {
    let imagenBuffer = null;
    let imagenMimeType = null;
    if (req.file) {
      imagenBuffer = req.file.buffer;
      imagenMimeType = req.file.mimetype;
    }
    const huella = new Huella({
      ...req.body,
      imagen: imagenBuffer,
      imagenMimeType: imagenMimeType,
      fecha: new Date().toLocaleDateString(),
      hora: new Date().toLocaleTimeString()
    });
    // Validar que los campos requeridos no estén vacíos
    const camposRequeridos = [
      'nombre', 'apellido', 'fechaNacimiento', 'idInstitucional', 
      'cedula', 'rolUniversidad', 'correoPersonal', 'carnet'
    ];
    for (const campo of camposRequeridos) {
      if (!huella[campo]) {
      return res.status(400).json({ 
          error: `El campo ${campo} es requerido`,
          detalles: `Valor recibido: ${huella[campo]}`
      });
    }
    }
    const savedHuella = await huella.save();
    res.status(200).json({ 
      message: "Datos guardados correctamente",
      huella: savedHuella 
    });
  } catch (error) {
    console.error("Error al guardar los datos:", error);
    res.status(500).json({ 
      error: "Error al guardar los datos",
      detalles: error.message 
    });
  }
});

// Ruta para obtener todas las huellas registradas
app.get("/api/huellas", async (req, res) => {
  try {
    const huellas = await Huella.find();
    res.json(huellas);
  } catch (error) {
    res.status(500).json({ error: "❌ Error al obtener los datos" });
  }
});

// 📌 Ruta para actualizar un registro de huella
app.put("/api/huellas/:id", upload.single("imagen"), async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    if (req.file) {
      updateData.imagen = req.file.buffer;
      updateData.imagenMimeType = req.file.mimetype;
    }
    const huellaActualizada = await Huella.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );
    if (!huellaActualizada) {
      return res.status(404).json({ error: "❌ Registro no encontrado" });
    }
    res.json({ 
      message: "✅ Registro actualizado correctamente",
      huella: huellaActualizada 
    });
  } catch (error) {
    console.error("Error al actualizar:", error);
    res.status(500).json({ 
      error: "❌ Error al actualizar el registro",
      detalles: error.message 
    });
  }
});

// 📌 Ruta para eliminar un registro de huella
app.delete("/api/huellas/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const huellaEliminada = await Huella.findByIdAndDelete(id);

    if (!huellaEliminada) {
      return res.status(404).json({ error: "❌ Registro no encontrado" });
    }

    res.json({ message: "✅ Registro eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar:", error);
    res.status(500).json({ 
      error: "❌ Error al eliminar el registro",
      detalles: error.message 
    });
  }
});

// Ruta para servir archivos estáticos (imágenes)
app.use('/api/uploads', express.static('uploads'));

// 📌 Ruta para buscar por número de carnet o número de tarjeta de visitante
app.get("/api/buscar-carnet/:carnet", async (req, res) => {
  try {
    const { carnet } = req.params;
    
    if (!carnet) {
      return res.status(400).json({ 
        error: "❌ El número de carnet es requerido" 
      });
    }

    // Buscar por carnet (usuarios normales) o numeroTarjeta (visitantes)
    const persona = await Huella.findOne({ $or: [ { carnet }, { numeroTarjeta: carnet } ] });

    if (persona) {
      res.json({ 
        persona,
        message: "✅ Persona encontrada" 
      });
    } else {
      res.status(404).json({ 
        error: "❌ Persona no encontrada" 
      });
    }
  } catch (error) {
    console.error("Error al buscar por carnet:", error);
    res.status(500).json({ 
      error: "❌ Error al buscar en la base de datos" 
    });
  }
});

// Ruta para verificar la contraseña del lector
app.post("/api/verify-password", async (req, res) => {
  try {
    const { correoInstitucional, password } = req.body;

    if (!correoInstitucional || !password) {
      return res.status(400).json({ error: "❌ Faltan datos requeridos" });
    }

    const lector = await User.findOne({ 
      correoInstitucional,
      role: "lector"
    });

    if (!lector) {
      return res.status(404).json({ error: "❌ Lector no encontrado" });
    }

    // Verificar la contraseña usando bcrypt
    const isMatch = await bcrypt.compare(password, lector.password);
    
    if (!isMatch) {
      return res.status(401).json({ verified: false });
    }

    res.status(200).json({ verified: true });
  } catch (error) {
    console.error("Error al verificar contraseña:", error);
    res.status(500).json({ error: "❌ Error al verificar contraseña" });
  }
});

// Ruta para registrar acceso (entrada/salida)
app.post("/api/registrar-acceso", async (req, res) => {
  try {
    const { carnet } = req.body;
    console.log("[ACCESO] Valor recibido para carnet/numeroTarjeta:", carnet);
    if (!carnet) {
      return res.status(400).json({ error: "❌ Se requiere carnet o número de tarjeta" });
    }
    // Buscar persona por carnet o numeroTarjeta
    const persona = await Huella.findOne({ $or: [ { carnet }, { numeroTarjeta: carnet } ] });
    console.log("[ACCESO] Persona encontrada:", persona);
    if (!persona) {
      return res.status(404).json({ error: "❌ Persona no encontrada" });
    }
    const hoy = new Date();
    const fechaHoy = hoy.toISOString().split('T')[0];
    // Buscar acceso abierto hoy (sin hora de salida)
    const accesoAbierto = await Acceso.findOne({
      $or: [
        { carnet: carnet },
        { numeroTarjeta: carnet }
      ],
      fecha: fechaHoy,
      horaSalida: { $exists: false }
    });
    if (!accesoAbierto) {
      // Registrar entrada
      const nuevoAcceso = new Acceso({
        personaId: persona._id,
        nombre: persona.nombre + ' ' + persona.apellido,
        rolUniversidad: persona.rolUniversidad,
        carnet: persona.carnet || '',
        numeroTarjeta: persona.numeroTarjeta || '',
        fecha: fechaHoy,
        horaEntrada: hoy.toTimeString().split(' ')[0]
      });
      await nuevoAcceso.save();
      return res.status(200).json({ message: "✅ Entrada registrada", tipo: "entrada", acceso: nuevoAcceso });
    } else {
      // Registrar salida
      accesoAbierto.horaSalida = hoy.toTimeString().split(' ')[0];
      await accesoAbierto.save();
      return res.status(200).json({ message: "✅ Salida registrada", tipo: "salida", acceso: accesoAbierto });
    }
  } catch (error) {
    console.error("Error al registrar acceso:", error);
    res.status(500).json({ error: "❌ Error al registrar acceso" });
  }
});

// Ruta para obtener historial de accesos con filtros y paginación
app.get('/api/accesos', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      nombre,
      rolUniversidad,
      carnet,
      numeroTarjeta,
      fecha,
      tipo // 'entrada' o 'salida'
    } = req.query;

    // Construir el filtro dinámicamente
    const filtro = {};
    if (nombre) filtro.nombre = { $regex: nombre, $options: 'i' };
    if (rolUniversidad) filtro.rolUniversidad = rolUniversidad;
    if (carnet) filtro.carnet = carnet;
    if (numeroTarjeta) filtro.numeroTarjeta = numeroTarjeta;
    if (fecha) filtro.fecha = fecha;
    if (tipo === 'entrada') filtro.horaEntrada = { $exists: true };
    if (tipo === 'salida') filtro.horaSalida = { $exists: true };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Acceso.countDocuments(filtro);
    const accesos = await Acceso.find(filtro)
      .sort({ fecha: -1, horaEntrada: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      accesos
    });
  } catch (error) {
    console.error('Error al obtener historial de accesos:', error);
    res.status(500).json({ error: 'Error al obtener historial de accesos' });
  }
});

// Ruta para obtener historial de personas con filtros y paginación
app.get('/api/personas', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      ...filtros
    } = req.query;

    // Construir el filtro dinámicamente para todos los campos
    const filtro = {};
    for (const [key, value] of Object.entries(filtros)) {
      if (value && key !== 'page' && key !== 'limit') {
        // Búsqueda por texto para la mayoría de campos
        filtro[key] = { $regex: value, $options: 'i' };
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Huella.countDocuments(filtro);
    const personas = await Huella.find(filtro)
      .sort({ nombre: 1, apellido: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      personas
    });
  } catch (error) {
    console.error('Error al obtener historial de personas:', error);
    res.status(500).json({ error: 'Error al obtener historial de personas' });
  }
});

// Endpoint para servir la imagen desde la base de datos
app.get('/api/huellas/:id/imagen', async (req, res) => {
  try {
    const huella = await Huella.findById(req.params.id);
    if (!huella || !huella.imagen) {
      return res.status(404).send('Imagen no encontrada');
    }
    res.set('Content-Type', huella.imagenMimeType || 'image/jpeg');
    res.send(huella.imagen);
  } catch (err) {
    res.status(500).send('Error al obtener la imagen');
  }
});

// Recuperar contraseña: solicitar token
app.post("/api/forgot-password", async (req, res) => {
    try {
        const { correoInstitucional } = req.body;
        const usuario = await User.findOne({ correoInstitucional });
        if (!usuario) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }

        // Generar token y fecha de expiración
        const token = require('crypto').randomBytes(20).toString("hex");
        const tokenExpira = new Date();
        tokenExpira.setHours(tokenExpira.getHours() + 1);

        usuario.resetPasswordToken = token;
        usuario.resetPasswordExpires = tokenExpira;
        await usuario.save();

        await enviarCorreoRecuperacion(usuario, token);

        res.json({ success: true, message: "Se ha enviado un correo con instrucciones para recuperar su contraseña" });
    } catch (error) {
        console.error("Error en recuperación de contraseña:", error);
        res.status(500).json({ error: "Error al procesar la solicitud" });
    }
});

// Verificar token (opcional, si tu frontend lo usa)
app.post("/api/verify-token", async (req, res) => {
    try {
        const { correoInstitucional, token } = req.body;
        const usuario = await User.findOne({ correoInstitucional, resetPasswordToken: token });
        if (!usuario) {
            return res.status(400).json({ error: "Token inválido o usuario no encontrado" });
        }
        if (!usuario.resetPasswordExpires || usuario.resetPasswordExpires < new Date()) {
            return res.status(400).json({ error: "El token ha expirado. Solicita uno nuevo." });
        }
        res.json({ success: true, message: "Token válido" });
    } catch (error) {
        res.status(500).json({ error: "Error al verificar el token" });
    }
});

// Restablecer contraseña
app.post("/api/reset-password", async (req, res) => {
    try {
        const { correoInstitucional, token, nuevaPassword } = req.body;
        const usuario = await User.findOne({ correoInstitucional, resetPasswordToken: token });
        if (!usuario) {
            return res.status(400).json({ error: "Token inválido o usuario no encontrado" });
        }
        if (!usuario.resetPasswordExpires || usuario.resetPasswordExpires < new Date()) {
            return res.status(400).json({ error: "El token ha expirado. Solicita uno nuevo." });
        }

        const hashedPassword = await require('bcryptjs').hash(nuevaPassword, 10);
        usuario.password = hashedPassword;
        usuario.resetPasswordToken = undefined;
        usuario.resetPasswordExpires = undefined;
        await usuario.save();

        res.json({ success: true, message: "Contraseña restablecida correctamente. Ya puedes iniciar sesión." });
    } catch (error) {
        console.error("[RESET PASSWORD] Error:", error);
        res.status(500).json({ error: "Error al restablecer la contraseña" });
    }
});

// Ruta para importar personas desde Excel
app.post('/api/personas/importar', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No se ha proporcionado ningún archivo' });
    }

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    // Validar y procesar cada fila
    const personasValidas = [];
    const errores = [];

    for (const [index, row] of data.entries()) {
      try {
        // Validar campos requeridos
        if (!row.nombre || !row.apellido || !row.cedula || !row.idInstitucional || !row.rolUniversidad) {
          errores.push(`Fila ${index + 2}: Faltan campos requeridos`);
          continue;
        }

        // Validar que la cédula e ID institucional sean únicos
        const existeCedula = await Huella.findOne({ cedula: row.cedula });
        const existeIdInstitucional = await Huella.findOne({ idInstitucional: row.idInstitucional });

        if (existeCedula) {
          errores.push(`Fila ${index + 2}: La cédula ${row.cedula} ya existe`);
          continue;
        }

        if (existeIdInstitucional) {
          errores.push(`Fila ${index + 2}: El ID institucional ${row.idInstitucional} ya existe`);
          continue;
        }

        // Crear nueva persona
        const nuevaPersona = new Huella({
          nombre: row.nombre,
          apellido: row.apellido,
          cedula: row.cedula,
          idInstitucional: row.idInstitucional,
          rolUniversidad: row.rolUniversidad,
          correoInstitucional: row.correoInstitucional || '',
          correoPersonal: row.correoPersonal || '',
          fechaNacimiento: row.fechaNacimiento || '',
          carnet: row.carnet || '',
          fecha: new Date().toLocaleDateString(),
          hora: new Date().toLocaleTimeString()
        });

        await nuevaPersona.save();
        personasValidas.push(nuevaPersona);
      } catch (error) {
        errores.push(`Fila ${index + 2}: ${error.message}`);
      }
    }

    res.json({
      success: true,
      message: `Se importaron ${personasValidas.length} personas correctamente`,
      errores: errores.length > 0 ? errores : null
    });
  } catch (error) {
    console.error('Error al importar personas:', error);
    res.status(500).json({
      success: false,
      error: 'Error al procesar el archivo Excel'
    });
  }
});

// 📌 Servidor corriendo
module.exports = app;

