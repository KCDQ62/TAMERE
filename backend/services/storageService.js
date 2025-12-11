const File = require('../models/File');
const s3 = require('../config/cloudStorage');
const { v4: uuidv4 } = require('uuid');

// Upload simple d'un fichier
const uploadSimpleFile = async (file, userId) => {
  try {
    const fileName = `${uuidv4()}-${file.originalname}`;
    const s3Key = `uploads/${userId}/${fileName}`;

    // Upload sur S3
    const uploadResult = await s3.upload({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: s3Key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'public-read'
    }).promise();

    // Créer l'entrée dans la base de données
    const fileDoc = new File({
      originalName: file.originalname,
      fileName,
      fileSize: file.size,
      mimeType: file.mimetype,
      s3Key,
      s3Url: uploadResult.Location,
      uploadedBy: userId,
      uploadComplete: true
    });

    await fileDoc.save();

    return {
      fileId: fileDoc._id,
      url: uploadResult.Location,
      fileName: file.originalname,
      fileSize: file.size
    };
  } catch (error) {
    console.error('Erreur d\'upload simple:', error);
    throw new Error('Erreur d\'upload du fichier');
  }
};

// Obtenir un fichier
const getFile = async (fileId) => {
  try {
    const file = await File.findById(fileId);
    
    if (!file) {
      throw new Error('Fichier non trouvé');
    }

    return file;
  } catch (error) {
    throw new Error('Erreur de récupération du fichier');
  }
};

// Supprimer un fichier
const deleteFile = async (fileId, userId) => {
  try {
    const file = await File.findById(fileId);
    
    if (!file) {
      throw new Error('Fichier non trouvé');
    }

    // Vérifier que l'utilisateur est le propriétaire
    if (file.uploadedBy.toString() !== userId.toString()) {
      throw new Error('Permission refusée');
    }

    // Supprimer de S3
    await s3.deleteObject({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: file.s3Key
    }).promise();

    // Supprimer de la base de données
    await File.findByIdAndDelete(fileId);

    return { message: 'Fichier supprimé' };
  } catch (error) {
    throw new Error('Erreur de suppression du fichier');
  }
};

// Générer une URL signée pour téléchargement
const generateDownloadUrl = async (fileId, expiresIn = 3600) => {
  try {
    const file = await File.findById(fileId);
    
    if (!file) {
      throw new Error('Fichier non trouvé');
    }

    // Générer une URL signée
    const url = await s3.getSignedUrlPromise('getObject', {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: file.s3Key,
      Expires: expiresIn
    });

    return { url };
  } catch (error) {
    throw new Error('Erreur de génération de l\'URL');
  }
};

// Lister les fichiers d'un utilisateur
const listUserFiles = async (userId, limit = 50, skip = 0) => {
  try {
    const files = await File.find({
      uploadedBy: userId,
      uploadComplete: true
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await File.countDocuments({
      uploadedBy: userId,
      uploadComplete: true
    });

    return {
      files,
      total,
      hasMore: skip + limit < total
    };
  } catch (error) {
    throw new Error('Erreur de listage des fichiers');
  }
};

module.exports = {
  uploadSimpleFile,
  getFile,
  deleteFile,
  generateDownloadUrl,
  listUserFiles
};