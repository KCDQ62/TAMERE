```javascript
const File = require('../models/File');
const s3 = require('../config/cloudStorage');
const { v4: uuidv4 } = require('uuid');

// Initialiser un upload multipart
const initializeUpload = async (originalName, fileSize, mimeType, userId) => {
  try {
    const fileName = `${uuidv4()}-${originalName}`;
    const s3Key = `uploads/${userId}/${fileName}`;

    // Créer l'upload multipart sur S3
    const multipartUpload = await s3.createMultipartUpload({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: s3Key,
      ContentType: mimeType,
    }).promise();

    // Créer l'entrée dans la base de données
    const file = new File({
      originalName,
      fileName,
      fileSize,
      mimeType,
      s3Key,
      s3Url: '',
      uploadedBy: userId,
      uploadId: multipartUpload.UploadId,
      uploadComplete: false,
    });

    await file.save();

    return {
      fileId: file._id,
      uploadId: multipartUpload.UploadId,
    };
  } catch (error) {
    throw new Error('Erreur d\'initialisation de l\'upload');
  }
};

// Upload d'un chunk
const uploadChunk = async (fileId, chunkBuffer, chunkNumber, totalChunks) => {
  try {
    const file = await File.findById(fileId);
    
    if (!file) {
      throw new Error('Fichier non trouvé');
    }

    // Upload du chunk sur S3
    const uploadResult = await s3.uploadPart({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: file.s3Key,
      PartNumber: chunkNumber,
      UploadId: file.uploadId,
      Body: chunkBuffer,
    }).promise();

    // Sauvegarder l'ETag du chunk
    file.chunks.push({
      chunkNumber,
      etag: uploadResult.ETag,
    });

    await file.save();

    return {
      chunkNumber,
      totalChunks,
      uploaded: file.chunks.length,
      progress: (file.chunks.length / totalChunks) * 100,
    };
  } catch (error) {
    throw new Error('Erreur d\'upload du chunk');
  }
};

// Finaliser l'upload
const completeUpload = async (fileId) => {
  try {
    const file = await File.findById(fileId);
    
    if (!file) {
      throw new Error('Fichier non trouvé');
    }

    // Trier les chunks par numéro
    const sortedChunks = file.chunks.sort((a, b) => a.chunkNumber - b.chunkNumber);

    // Compléter l'upload multipart sur S3
    const completeResult = await s3.completeMultipartUpload({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: file.s3Key,
      UploadId: file.uploadId,
      MultipartUpload: {
        Parts: sortedChunks.map(chunk => ({
          ETag: chunk.etag,
          PartNumber: chunk.chunkNumber,
        })),
      },
    }).promise();

    // Mettre à jour le fichier
    file.s3Url = completeResult.Location;
    file.uploadComplete = true;
    await file.save();

    return {
      fileId: file._id,
      url: file.s3Url,
      fileName: file.originalName,
      fileSize: file.fileSize,
    };
  } catch (error) {
    throw new Error('Erreur de finalisation de l\'upload');
  }
};

// Annuler un upload
const abortUpload = async (fileId) => {
  try {
    const file = await File.findById(fileId);
    
    if (!file) {
      throw new Error('Fichier non trouvé');
    }

    // Annuler l'upload multipart sur S3
    await s3.abortMultipartUpload({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: file.s3Key,
      UploadId: file.uploadId,
    }).promise();

    // Supprimer l'entrée de la base de données
    await File.findByIdAndDelete(fileId);
  } catch (error) {
    throw new Error('Erreur d\'annulation de l\'upload');
  }
};

module.exports = {
  initializeUpload,
  uploadChunk,
  completeUpload,
  abortUpload,
};
```