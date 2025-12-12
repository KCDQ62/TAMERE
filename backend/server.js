require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const connectDB = require('./config/database');
const socketHandler = require('./socket/socketHandler');

// Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const messageRoutes = require('./routes/messages');
const groupRoutes = require('./routes/groups');
const fileRoutes = require('./routes/files');

const app = express();
const server = http.createServer(app);

// ✅ CORS ultra-permissif pour Railway
const allowedOrigins = [
  'http://localhost:8080',
  'http://localhost:3000',
  'http://127.0.0.1:8080',
  process.env.CLIENT_URL,
  process.env.FRONTEND_URL,
].filter(Boolean);

console.log('🌐 Origines autorisées:', allowedOrigins);

// ✅ Configuration Socket.io avec CORS permissif
const io = socketIo(server, {
  cors: {
    origin: '*', // Accepter toutes les origines (Railway)
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000
});

// Connexion à MongoDB
connectDB();

// ✅ CORS permissif pour Express
app.use(cors({
  origin: '*', // Accepter toutes les origines
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ✅ Logger les requêtes
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// Routes API
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/files', fileRoutes);

// Route de santé améliorée
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState;
  const dbStates = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    mongodb: {
      status: dbStates[dbStatus],
      connected: dbStatus === 1
    },
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
    }
  });
});

// Route racine
app.get('/', (req, res) => {
  res.json({ 
    name: 'SecureChat API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      users: '/api/users',
      messages: '/api/messages',
      groups: '/api/groups',
      files: '/api/files'
    },
    websocket: {
      url: process.env.RAILWAY_PUBLIC_DOMAIN 
        ? `wss://${process.env.RAILWAY_PUBLIC_DOMAIN}` 
        : 'ws://localhost:' + (process.env.PORT || 3000)
    }
  });
});

// Gestion des WebSockets
socketHandler(io);

// ✅ Route catch-all pour les 404
app.use((req, res) => {
  console.log(`❌ 404 - Route non trouvée: ${req.method} ${req.path}`);
  res.status(404).json({ 
    error: 'Route non trouvée',
    path: req.path,
    method: req.method
  });
});

// ✅ Gestion globale des erreurs
app.use((err, req, res, next) => {
  console.error('❌ Erreur serveur:', err);
  res.status(err.status || 500).json({ 
    error: 'Erreur serveur interne',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Une erreur est survenue',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

const PORT = process.env.PORT || 3000;

// ✅ Démarrage du serveur avec gestion d'erreurs
server.listen(PORT, '0.0.0.0', () => {
  console.log('\n🚀========================================');
  console.log('🚀 SERVEUR DÉMARRÉ AVEC SUCCÈS');
  console.log('🚀========================================');
  console.log(`📡 Port: ${PORT}`);
  console.log(`🌍 Environnement: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 URL publique: ${process.env.RAILWAY_PUBLIC_DOMAIN || 'localhost:' + PORT}`);
  console.log(`🔌 WebSocket prêt`);
  console.log(`📊 MongoDB: ${mongoose.connection.readyState === 1 ? '✅ Connecté' : '⏳ En attente...'}`);
  console.log('🚀========================================\n');
});

// ✅ Gestion de l'arrêt gracieux
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM reçu, arrêt gracieux...');
  server.close(() => {
    console.log('✅ Serveur HTTP fermé');
    mongoose.connection.close(false, () => {
      console.log('✅ Connexion MongoDB fermée');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('\n👋 SIGINT reçu, arrêt gracieux...');
  server.close(() => {
    console.log('✅ Serveur HTTP fermé');
    mongoose.connection.close(false, () => {
      console.log('✅ Connexion MongoDB fermée');
      process.exit(0);
    });
  });
});

// ✅ Gestion des erreurs non capturées
process.on('uncaughtException', (err) => {
  console.error('💥 Exception non capturée:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Promise rejetée non gérée:', reason);
  process.exit(1);
});