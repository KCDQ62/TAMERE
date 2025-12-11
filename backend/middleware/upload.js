```javascript
const multer = require('multer');
const path = require('path');

// Configuration pour upload en mémoire (pour chunks)
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Accepter tous les types de fichiers
  cb(null, true);
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.CHUNK_SIZE) || 5 * 1024 * 1024, // 5MB par chunk
  },
});

module.exports = upload;
```
