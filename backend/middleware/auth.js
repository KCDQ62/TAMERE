const { verifyToken } = require('../config/jwt');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    // Récupérer le token depuis l'en-tête Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token manquant' });
    }

    const token = authHeader.substring(7); // Retirer "Bearer "
    
    // Vérifier le token
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({ error: 'Token invalide' });
    }

    // Récupérer l'utilisateur
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ error: 'Utilisateur non trouvé' });
    }

    // Ajouter l'utilisateur à la requête
    req.user = user;
    req.userId = user._id;
    
    next();
  } catch (error) {
    console.error('Erreur auth middleware:', error);
    res.status(401).json({ error: 'Authentification échouée' });
  }
};

module.exports = auth;