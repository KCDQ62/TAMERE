// Gestion de l'upload de fichiers
class FileUploadManager {
  constructor() {
    this.CHUNK_SIZE = 5 * 1024 * 1024; // 5MB par chunk
    this.activeUploads = new Map();
  }

  // Upload de fichiers
  async uploadFiles(files, conversationId, conversationType) {
    if (!files || files.length === 0) return;

    for (const file of files) {
      await this.uploadFile(file, conversationId, conversationType);
    }
  }

  // Upload d'un fichier individuel
  async uploadFile(file, conversationId, conversationType) {
    try {
      // Vérifier la taille du fichier
      const maxSize = 50 * 1024 * 1024; // 50MB max
      if (file.size > maxSize) {
        UI.showNotification('Le fichier est trop volumineux (max 50MB)', 'error');
        return;
      }

      // Afficher la progression
      const uploadId = this.showUploadProgress(file.name);

      if (file.size <= this.CHUNK_SIZE) {
        // Upload simple pour les petits fichiers
        await this.uploadSmallFile(file, conversationId, conversationType, uploadId);
      } else {
        // Upload par chunks pour les gros fichiers
        await this.uploadLargeFile(file, conversationId, conversationType, uploadId);
      }

    } catch (error) {
      console.error('Erreur d\'upload:', error);
      UI.showNotification('Erreur lors de l\'envoi du fichier', 'error');
    }
  }

  // Upload simple pour petits fichiers
  async uploadSmallFile(file, conversationId, conversationType, uploadId) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('conversationId', conversationId);
    formData.append('conversationType', conversationType);

    try {
      const response = await fetch(`${API_URL}/files/upload/simple`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Auth.getToken()}`
        },
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        this.sendFileMessage(conversationId, conversationType, result);
        this.hideUploadProgress(uploadId);
        UI.showNotification('Fichier envoyé', 'success');
      } else {
        throw new Error('Erreur d\'upload');
      }
    } catch (error) {
      this.hideUploadProgress(uploadId);
      throw error;
    }
  }

  // Upload par chunks pour gros fichiers
  async uploadLargeFile(file, conversationId, conversationType, uploadId) {
    try {
      // 1. Initialiser l'upload
      const initResponse = await fetch(`${API_URL}/files/upload/init`, {
        method: 'POST',
        headers: Auth.getAuthHeaders(),
        body: JSON.stringify({
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type
        })
      });

      if (!initResponse.ok) {
        throw new Error('Erreur d\'initialisation');
      }

      const { fileId, uploadId: serverUploadId } = await initResponse.json();

      // 2. Upload des chunks
      const totalChunks = Math.ceil(file.size / this.CHUNK_SIZE);
      
      for (let i = 0; i < totalChunks; i++) {
        const start = i * this.CHUNK_SIZE;
        const end = Math.min(start + this.CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);

        const formData = new FormData();
        formData.append('chunk', chunk);
        formData.append('fileId', fileId);
        formData.append('chunkNumber', i + 1);
        formData.append('totalChunks', totalChunks);

        const chunkResponse = await fetch(`${API_URL}/files/upload/chunk`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Auth.getToken()}`
          },
          body: formData
        });

        if (!chunkResponse.ok) {
          throw new Error('Erreur d\'upload du chunk');
        }

        const progress = ((i + 1) / totalChunks) * 100;
        this.updateUploadProgress(uploadId, progress);
      }

      // 3. Finaliser l'upload
      const completeResponse = await fetch(`${API_URL}/files/upload/complete`, {
        method: 'POST',
        headers: Auth.getAuthHeaders(),
        body: JSON.stringify({ fileId })
      });

      if (!completeResponse.ok) {
        throw new Error('Erreur de finalisation');
      }

      const result = await completeResponse.json();
      this.sendFileMessage(conversationId, conversationType, result);
      this.hideUploadProgress(uploadId);
      UI.showNotification('Fichier envoyé', 'success');

    } catch (error) {
      this.hideUploadProgress(uploadId);
      throw error;
    }
  }

  // Envoyer un message avec le fichier
  sendFileMessage(conversationId, conversationType, fileData) {
    const messageData = {
      content: fileData.fileName,
      type: 'file',
      fileUrl: fileData.url,
      fileName: fileData.fileName,
      fileSize: fileData.fileSize
    };

    if (conversationType === 'group') {
      socket.sendGroupMessage(conversationId, messageData.content, 'file', {
        fileUrl: fileData.url,
        fileName: fileData.fileName,
        fileSize: fileData.fileSize
      });
    } else {
      socket.sendPrivateMessage(conversationId, messageData.content, 'file', {
        fileUrl: fileData.url,
        fileName: fileData.fileName,
        fileSize: fileData.fileSize
      });
    }
  }

  // Afficher la progression de l'upload
  showUploadProgress(fileName) {
    const uploadId = Date.now().toString();
    const progressDiv = document.createElement('div');
    progressDiv.id = `upload-${uploadId}`;
    progressDiv.className = 'upload-progress';
    progressDiv.innerHTML = `
      <div class="upload-info">
        <span class="upload-name">${fileName}</span>
        <span class="upload-percent">0%</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width: 0%"></div>
      </div>
    `;

    const container = document.getElementById('messagesContainer');
    if (container) {
      container.appendChild(progressDiv);
      container.scrollTop = container.scrollHeight;
    }

    return uploadId;
  }

  // Mettre à jour la progression
  updateUploadProgress(uploadId, percent) {
    const progressDiv = document.getElementById(`upload-${uploadId}`);
    if (progressDiv) {
      progressDiv.querySelector('.upload-percent').textContent = `${Math.round(percent)}%`;
      progressDiv.querySelector('.progress-fill').style.width = `${percent}%`;
    }
  }

  // Masquer la progression
  hideUploadProgress(uploadId) {
    const progressDiv = document.getElementById(`upload-${uploadId}`);
    if (progressDiv) {
      setTimeout(() => progressDiv.remove(), 500);
    }
  }

  // Formater la taille d'un fichier
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
}

// Instance globale
const FileUpload = new FileUploadManager();

// Styles pour l'upload
const uploadStyles = document.createElement('style');
uploadStyles.textContent = `
  .upload-progress {
    padding: 12px;
    background: var(--bg-secondary);
    border-radius: 8px;
    margin: 8px 0;
  }

  .upload-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
    font-size: 12px;
  }

  .upload-name {
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
  }

  .upload-percent {
    color: var(--text-secondary);
    margin-left: 8px;
  }

  .progress-bar {
    height: 4px;
    background: var(--bg-hover);
    border-radius: 2px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: var(--primary);
    transition: width 0.3s ease;
  }
`;
document.head.appendChild(uploadStyles);