// Point d'entrée principal de l'application
class ChatApp {
  constructor() {
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;

    try {
      // Vérifier l'authentification
      if (!Auth.isAuthenticated()) {
        window.location.href = 'login.html';
        return;
      }

      // Initialiser l'interface
      UI.init();

      // Se connecter au serveur WebSocket
      socket.connect();

      // Attendre la connexion
      socket.on('connected', async () => {
        console.log('Application connectée');
        
        // Charger les données initiales
        await this.loadInitialData();
        
        // Initialiser les modules
        Messaging.init();
        Groups.init();
        WebRTC.init();

        // Afficher l'application
        document.getElementById('app').classList.remove('hidden');
        
        this.initialized = true;
      });

      // Gérer la déconnexion
      socket.on('disconnected', () => {
        console.log('Déconnecté du serveur');
        this.showConnectionError();
      });

      // Gérer les erreurs
      socket.on('error', (error) => {
        console.error('Erreur de connexion:', error);
        this.showConnectionError();
      });

    } catch (error) {
      console.error('Erreur d\'initialisation:', error);
      this.showError('Erreur d\'initialisation de l\'application');
    }
  }

  async loadInitialData() {
    try {
      // Charger les conversations
      await this.loadConversations();
      
      // Charger les groupes (déjà fait dans Groups.init())
      // Groups.loadGroups() est appelé automatiquement
      
    } catch (error) {
      console.error('Erreur de chargement des données:', error);
    }
  }

  async loadConversations() {
    try {
      const response = await fetch(`${API_URL}/conversations`, {
        headers: Auth.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Erreur de chargement des conversations');
      }

      const conversations = await response.json();
      
      // Ajouter chaque conversation à l'interface
      conversations.forEach(conversation => {
        UI.addConversation(conversation);
      });

      // Sélectionner la première conversation si disponible
      if (conversations.length > 0) {
        UI.showConversation(conversations[0].id);
      }
    } catch (error) {
      console.error('Erreur de chargement des conversations:', error);
    }
  }

  showConnectionError() {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'connection-error';
    errorDiv.innerHTML = `
      <div class="error-content">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" x2="12"></line>
          <line x1="12" y1="16" x2="12.01" x2="16"></line>
        </svg>
        <h3>Connexion perdue</h3>
        <p>Tentative de reconnexion...</p>
      </div>
    `;
    
    document.body.appendChild(errorDiv);

    // Retirer l'erreur à la reconnexion
    socket.on('connected', () => {
      errorDiv.remove();
    });
  }

  showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'app-error';
    errorDiv.innerHTML = `
      <div class="error-content">
        <h3>Erreur</h3>
        <p>${message}</p>
        <button onclick="window.location.reload()" class="btn-primary">Recharger</button>
      </div>
    `;
    
    document.body.appendChild(errorDiv);
  }

  // Gérer la visibilité de la page
  handleVisibilityChange() {
    if (document.hidden) {
      // Page cachée - peut-être réduire l'activité
      socket.updateOnlineStatus('away');
    } else {
      // Page visible - reprendre l'activité normale
      socket.updateOnlineStatus('online');
    }
  }

  // Nettoyer avant de quitter
  cleanup() {
    socket.disconnect();
    WebRTC.endCall();
  }
}

// Créer l'instance de l'application
const app = new ChatApp();

// Initialiser au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});

// Gérer la visibilité de la page
document.addEventListener('visibilitychange', () => {
  app.handleVisibilityChange();
});

// Nettoyer avant de quitter
window.addEventListener('beforeunload', () => {
  app.cleanup();
});

// Ajouter les styles pour les erreurs
const errorStyles = document.createElement('style');
errorStyles.textContent = `
  .connection-error,
  .app-error {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
  }

  .error-content {
    text-align: center;
    padding: 40px;
    background: var(--bg-secondary);
    border-radius: 12px;
    max-width: 400px;
  }

  .error-content svg {
    color: var(--warning);
    margin-bottom: 20px;
  }

  .error-content h3 {
    font-size: 24px;
    margin-bottom: 12px;
  }

  .error-content p {
    color: var(--text-secondary);
    margin-bottom: 20px;
  }

  .connection-error .error-content svg {
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }
`;
document.head.appendChild(errorStyles);