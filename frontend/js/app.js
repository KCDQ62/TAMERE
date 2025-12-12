// Point d'entrée principal de l'application
class ChatApp {
  constructor() {
    this.initialized = false;
    this.connectionTimeout = null;
  }

  async init() {
    if (this.initialized) return;

    try {
      // Vérifier l'authentification
      if (!Auth.isAuthenticated()) {
        window.location.href = 'login.html';
        return;
      }

      // Initialiser l'interface IMMÉDIATEMENT (pas d'attente)
      UI.init();

      // Afficher l'app TOUT DE SUITE (même sans socket)
      document.getElementById('app').classList.remove('hidden');
      console.log('✅ Interface affichée');

      // Charger les données initiales (sans socket)
      await this.loadInitialData();

      // Initialiser les modules (ils géreront l'absence de socket)
      Messaging.init();
      Groups.init();
      WebRTC.init();

      // MAINTENANT se connecter au socket
      socket.connect();

      // Timeout de CONNEXION uniquement (pas d'affichage)
      this.connectionTimeout = setTimeout(() => {
        if (!socket.isConnected) {
          console.warn('⚠️ Socket non connecté après 5s - mode dégradé');
          this.showConnectionWarning();
        }
      }, 5000);

      // Événements socket
      socket.on('connected', () => {
        console.log('✅ Socket connecté');
        clearTimeout(this.connectionTimeout);
        this.hideConnectionWarning();
        
        // Mettre à jour le statut MAINTENANT que le socket existe
        socket.updateOnlineStatus('online');
        
        // Rejoindre les groupes
        const groupIds = Array.from(Groups.groups.keys());
        if (groupIds.length > 0) {
          socket.joinGroups(groupIds);
        }
        
        this.initialized = true;
      });

      socket.on('disconnected', () => {
        console.log('⚠️ Socket déconnecté');
        this.showConnectionWarning();
      });

      socket.on('error', (error) => {
        console.error('❌ Erreur socket:', error);
        this.showConnectionWarning();
      });

    } catch (error) {
      console.error('❌ Erreur d\'initialisation:', error);
      this.showError('Erreur d\'initialisation de l\'application');
    }
  }

  async loadInitialData() {
    try {
      // Charger le profil utilisateur
      await UI.loadUserProfile();
      
      // Charger les groupes
      await Groups.loadGroups();
      
      // Charger les conversations (si endpoint existe)
      // await this.loadConversations();
      
    } catch (error) {
      console.error('❌ Erreur chargement données:', error);
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
      
      conversations.forEach(conversation => {
        UI.addConversation(conversation);
      });

      if (conversations.length > 0) {
        UI.showConversation(conversations[0].id);
      }
    } catch (error) {
      console.error('❌ Erreur chargement conversations:', error);
    }
  }

  showConnectionWarning() {
    let warningDiv = document.getElementById('connection-warning');
    
    if (!warningDiv) {
      warningDiv = document.createElement('div');
      warningDiv.id = 'connection-warning';
      warningDiv.className = 'connection-warning';
      warningDiv.innerHTML = `
        <div class="warning-content">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span>Connexion en cours...</span>
        </div>
      `;
      document.body.appendChild(warningDiv);
    }
  }

  hideConnectionWarning() {
    const warningDiv = document.getElementById('connection-warning');
    if (warningDiv) {
      warningDiv.remove();
    }
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

  handleVisibilityChange() {
    if (document.hidden) {
      if (socket.isConnected) {
        socket.updateOnlineStatus('away');
      }
    } else {
      if (socket.isConnected) {
        socket.updateOnlineStatus('online');
      }
    }
  }

  cleanup() {
    clearTimeout(this.connectionTimeout);
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

// Styles pour les erreurs et warnings
const errorStyles = document.createElement('style');
errorStyles.textContent = `
  .connection-warning {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: var(--warning);
    color: #000;
    padding: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  }

  .warning-content {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .warning-content svg {
    animation: pulse 2s infinite;
  }

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

  .error-content h3 {
    font-size: 24px;
    margin-bottom: 12px;
    color: var(--danger);
  }

  .error-content p {
    color: var(--text-secondary);
    margin-bottom: 20px;
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