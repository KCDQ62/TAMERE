require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');  // ⬅️ 
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

// ✅ CORRECTION: CORS flexible pour Railway
const allowedOrigins = [
  'http://localhost:8080',
  'http://localhost:3000',
  process.env.CLIENT_URL,
  process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : null,
].filter(Boolean);

const io = socketIo(server, {
  cors: {
    origin: (origin, callback) => {
      // Permettre les requêtes sans origin (mobile apps, Postman)
      if (!origin) return callback(null, true);
      
      // Permettre tous les domaines Railway
      if (origin.includes('railway.app') || origin.includes('up.railway.app')) {
        return callback(null, true);
      }
      
      // Vérifier la liste blanche
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST'],
    credentials: true
  },
  // ✅ CORRECTION: Ajouter transport WebSocket
  transports: ['websocket', 'polling']
});

// Connexion à la base de données
connectDB();

// ✅ CORRECTION: Middleware CORS flexible
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (origin.includes('railway.app') || origin.includes('up.railway.app')) {
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ CORRECTION: Ajouter logs de démarrage
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Routes API
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/files', fileRoutes);

// Route de test
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Serveur en ligne',
    env: process.env.NODE_ENV,
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// ✅ CORRECTION: Route racine
app.get('/', (req, res) => {
  res.json({ 
    message: 'Communication App API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      users: '/api/users',
      messages: '/api/messages',
      groups: '/api/groups',
      files: '/api/files'
    }
  });
});

// Gestion des WebSockets
socketHandler(io);

// Gestion des erreurs 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route non trouvée' });
});

// Gestion globale des erreurs
app.use((err, req, res, next) => {
  console.error('Erreur serveur:', err);
  res.status(500).json({ 
    error: 'Erreur serveur interne',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
  console.log(`📡 WebSocket prêt`);
  console.log(`🌍 Environnement: ${process.env.NODE_ENV}`);
  console.log(`🔗 URL publique: ${process.env.RAILWAY_PUBLIC_DOMAIN || 'localhost'}`);
});