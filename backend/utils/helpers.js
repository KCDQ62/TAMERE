// Formater la taille d'un fichier
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Valider une adresse email
function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// Valider un nom d'utilisateur
function isValidUsername(username) {
  // Entre 3 et 20 caractères, lettres, chiffres, tirets et underscores uniquement
  const re = /^[a-zA-Z0-9_-]{3,20}$/;
  return re.test(username);
}

// Sanitiser une chaîne de caractères
function sanitizeString(str) {
  return str
    .trim()
    .replace(/[<>]/g, '') // Retirer les balises HTML
    .substring(0, 1000); // Limiter la longueur
}

// Générer un code aléatoire
function generateCode(length = 6) {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = '';
  
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  
  return code;
}

// Vérifier si un fichier est une image
function isImageFile(mimeType) {
  return mimeType.startsWith('image/');
}

// Vérifier si un fichier est une vidéo
function isVideoFile(mimeType) {
  return mimeType.startsWith('video/');
}

// Vérifier si un fichier est un audio
function isAudioFile(mimeType) {
  return mimeType.startsWith('audio/');
}

// Obtenir le type de fichier
function getFileType(mimeType) {
  if (isImageFile(mimeType)) return 'image';
  if (isVideoFile(mimeType)) return 'video';
  if (isAudioFile(mimeType)) return 'audio';
  return 'file';
}

// Formater une date relative
function getRelativeTime(date) {
  const now = new Date();
  const diff = now - new Date(date);
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (seconds < 60) return 'À l\'instant';
  if (minutes < 60) return `Il y a ${minutes} min`;
  if (hours < 24) return `Il y a ${hours}h`;
  if (days < 7) return `Il y a ${days}j`;
  
  return new Date(date).toLocaleDateString('fr-FR');
}

// Pagination helper
function paginate(page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  return { skip, limit };
}

// Gestion des erreurs async
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  formatFileSize,
  isValidEmail,
  isValidUsername,
  sanitizeString,
  generateCode,
  isImageFile,
  isVideoFile,
  isAudioFile,
  getFileType,
  getRelativeTime,
  paginate,
  asyncHandler
};