const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Servir les fichiers statiques
app.use(express.static(__dirname, {
  setHeaders: (res, filePath) => {
    // Headers pour les fichiers JS
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    }
    // Headers pour les fichiers CSS
    if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
    }
    // Headers pour les fichiers HTML
    if (filePath.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
    }
  }
}));

// Route pour toutes les URLs (SPA)
app.get('*', (req, res) => {
  // Si c'est une requête pour un fichier statique, laisser express.static gérer
  if (req.path.includes('.')) {
    return;
  }
  
  // Sinon, servir index.html
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Frontend démarré sur le port ${PORT}`);
  console.log(`🌍 http://localhost:${PORT}`);
});