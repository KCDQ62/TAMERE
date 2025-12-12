const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'votre_secret_super_securise_changez_moi_en_production';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';

// Générer un token JWT
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRE }
  );
};

// Vérifier un token JWT
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    console.error('Erreur vérification token:', error.message);
    return null;
  }
};

module.exports = {
  generateToken,
  verifyToken,
  JWT_SECRET,
  JWT_EXPIRE
};