```javascript
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const { initializeUpload, uploadChunk, completeUpload, abortUpload } = require('../services/uploadService');

// Initialiser un upload multipart
router.post('/upload/init', auth, async (req, res) => {
  try {
    const { fileName, fileSize, mimeType } = req.body;
    const result = await initializeUpload(fileName, fileSize, mimeType, req.user._id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Erreur d\'initialisation de l\'upload' });
  }
});

// Upload d'un chunk
router.post('/upload/chunk', auth, upload.single('chunk'), async (req, res) => {
  try {
    const { fileId, chunkNumber, totalChunks } = req.body;
    const chunk = req.file.buffer;
    
    const result = await uploadChunk(fileId, chunk, parseInt(chunkNumber), parseInt(totalChunks));
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Erreur d\'upload du chunk' });
  }
});

// Finaliser l'upload
router.post('/upload/complete', auth, async (req, res) => {
  try {
    const { fileId } = req.body;
    const result = await completeUpload(fileId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Erreur de finalisation de l\'upload' });
  }
});

// Annuler un upload
router.post('/upload/abort', auth, async (req, res) => {
  try {
    const { fileId } = req.body;
    await abortUpload(fileId);
    res.json({ message: 'Upload annulé' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur d\'annulation de l\'upload' });
  }
});

module.exports = router;
```
