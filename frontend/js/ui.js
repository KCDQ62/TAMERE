// Gestion de l'interface utilisateur
class UIManager {
  constructor() {
    this.currentConversation = null;
    this.currentConversationType = null; // 'user' ou 'group'
    this.conversations = new Map();
  }

  init() {
    this.setupEventListeners();
    this.loadUserProfile();
  }

  setupEventListeners() {
    // Bouton de déconnexion
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
      Auth.logout();
    });

    // Onglets sidebar
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.switchTab(btn.dataset.tab);
      });
    });

    // Recherche
    document.getElementById('searchInput')?.addEventListener('input', (e) => {
      this.handleSearch(e.target.value);
    });

    // Création de groupe
    document.getElementById('createGroupBtn')?.addEventListener('click', () => {
      this.showCreateGroupModal();
    });

    // Envoi de message
    document.getElementById('sendBtn')?.addEventListener('click', () => {
      this.sendMessage();
    });

    document.getElementById('messageInput')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // Pièce jointe
    document.getElementById('attachBtn')?.addEventListener('click', () => {
      document.getElementById('fileInput')?.click();
    });

    document.getElementById('fileInput')?.addEventListener('change', (e) => {
      this.handleFileSelect(e.target.files);
    });

    // Appels
    document.getElementById('videoCallBtn')?.addEventListener('click', () => {
      this.startCall('video');
    });

    document.getElementById('audioCallBtn')?.addEventListener('click', () => {
      this.startCall('audio');
    });
  }

  // Charger le profil utilisateur
  async loadUserProfile() {
    try {
      const user = await Auth.getProfile();
      
      document.getElementById('userName').textContent = user.username;
      document.getElementById('userStatus').textContent = 'En ligne';
      document.getElementById('userAvatar').textContent = user.username.charAt(0).toUpperCase();
      
    } catch (error) {
      console.error('Erreur de chargement du profil:', error);
    }
  }

  // Changer d'onglet
  switchTab(tabName) {
    // Mettre à jour les boutons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // Mettre à jour le contenu
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('active', content.id === `${tabName}Tab`);
    });
  }

  // Recherche
  async handleSearch(query) {
    if (query.length < 2) return;

    try {
      const response = await fetch(`${API_URL}/users/search?query=${encodeURIComponent(query)}`, {
        headers: Auth.getAuthHeaders()
      });

      if (response.ok) {
        const users = await response.json();
        this.displaySearchResults(users);
      }
    } catch (error) {
      console.error('Erreur de recherche:', error);
    }
  }

  // Afficher les résultats de recherche
  displaySearchResults(users) {
    // TODO: Implémenter l'affichage des résultats
    console.log('Résultats de recherche:', users);
  }

  // Ajouter une conversation
  addConversation(conversation) {
    const list = document.getElementById('conversationsList');
    
    const conv = document.createElement('div');
    conv.className = 'conversation-item';
    conv.dataset.id = conversation.id;
    conv.dataset.type = conversation.type || 'user';
    
    conv.innerHTML = `
      <div class="avatar">${conversation.name.charAt(0).toUpperCase()}</div>
      <div class="conversation-info">
        <h4>${conversation.name}</h4>
        <p>${conversation.lastMessage || 'Aucun message'}</p>
      </div>
      <div class="conversation-meta">
        <span class="time">${this.formatTime(conversation.lastMessageTime)}</span>
        ${conversation.unreadCount ? `<span class="unread-badge">${conversation.unreadCount}</span>` : ''}
      </div>
    `;

    conv.addEventListener('click', () => {
      this.showConversation(conversation.id, conversation.type);
    });

    list.appendChild(conv);
    this.conversations.set(conversation.id, conversation);
  }

  // Afficher une conversation
  showConversation(id, type = 'user') {
    this.currentConversation = id;
    this.currentConversationType = type;

    // Mettre en surbrillance la conversation sélectionnée
    document.querySelectorAll('.conversation-item').forEach(item => {
      item.classList.toggle('active', item.dataset.id === id);
    });

    // Afficher le conteneur de chat
    document.getElementById('emptyState')?.classList.add('hidden');
    document.getElementById('chatContainer')?.classList.remove('hidden');

    // Charger les messages
    this.loadMessages(id, type);

    // Mettre à jour l'en-tête
    const conversation = this.conversations.get(id);
    if (conversation) {
      document.getElementById('chatName').textContent = conversation.name;
      document.getElementById('chatAvatar').textContent = conversation.name.charAt(0).toUpperCase();
      document.getElementById('chatStatus').textContent = conversation.status || 'Hors ligne';
    }
  }

  // Charger les messages
  async loadMessages(id, type) {
    try {
      const endpoint = type === 'group' 
        ? `${API_URL}/messages/group/${id}`
        : `${API_URL}/messages/user/${id}`;

      const response = await fetch(endpoint, {
        headers: Auth.getAuthHeaders()
      });

      if (response.ok) {
        const messages = await response.json();
        this.displayMessages(messages);
      }
    } catch (error) {
      console.error('Erreur de chargement des messages:', error);
    }
  }

  // Afficher les messages
  displayMessages(messages) {
    const container = document.getElementById('messagesContainer');
    container.innerHTML = '';

    messages.forEach(message => {
      this.addMessageToUI(message);
    });

    this.scrollToBottom();
  }

  // Ajouter un message à l'interface
  addMessageToUI(message) {
    const container = document.getElementById('messagesContainer');
    const currentUser = Auth.getUser();
    const isOwn = message.sender._id === currentUser.id || message.sender === currentUser.id;

    const messageEl = document.createElement('div');
    messageEl.className = `message ${isOwn ? 'own' : ''}`;
    messageEl.dataset.id = message._id;

    let content = '';
    
    if (message.type === 'file' || message.fileUrl) {
      content = `
        <div class="file-message">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
            <polyline points="13 2 13 9 20 9"></polyline>
          </svg>
          <a href="${message.fileUrl}" target="_blank">${message.fileName || 'Fichier'}</a>
        </div>
      `;
    } else {
      content = `<p>${this.escapeHtml(message.content)}</p>`;
    }

    messageEl.innerHTML = `
      ${!isOwn ? `<div class="message-avatar">${message.sender.username?.charAt(0).toUpperCase() || 'U'}</div>` : ''}
      <div class="message-content">
        ${!isOwn ? `<div class="message-author">${message.sender.username || 'Utilisateur'}</div>` : ''}
        ${content}
        <div class="message-time">${this.formatTime(message.createdAt)}</div>
      </div>
    `;

    container.appendChild(messageEl);
  }

  // Envoyer un message
  sendMessage() {
    const input = document.getElementById('messageInput');
    const content = input.value.trim();

    if (!content || !this.currentConversation) return;

    if (this.currentConversationType === 'group') {
      socket.sendGroupMessage(this.currentConversation, content);
    } else {
      socket.sendPrivateMessage(this.currentConversation, content);
    }

    input.value = '';
  }

  // Gérer la sélection de fichiers
  handleFileSelect(files) {
    if (!files || files.length === 0) return;
    // Implémenter l'upload de fichiers via FileUpload
    FileUpload.uploadFiles(files, this.currentConversation, this.currentConversationType);
  }

  // Démarrer un appel
  startCall(type) {
    if (!this.currentConversation || this.currentConversationType === 'group') {
      this.showNotification('Les appels ne sont disponibles que pour les conversations privées', 'warning');
      return;
    }

    WebRTC.startCall(this.currentConversation, type);
  }

  // Afficher/masquer l'indicateur de frappe
  showTypingIndicator(username) {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
      indicator.classList.remove('hidden');
      indicator.innerHTML = `<span></span><span></span><span></span> ${username} est en train d'écrire...`;
    }
  }

  hideTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
      indicator.classList.add('hidden');
    }
  }

  // Afficher une notification
  showNotification(message, type = 'info') {
    // Créer une notification toast
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      background: var(--bg-secondary);
      border-left: 4px solid var(--${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'primary'});
      border-radius: 4px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10000;
      animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // Scroll vers le bas
  scrollToBottom() {
    const container = document.getElementById('messagesContainer');
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }

  // Formater l'heure
  formatTime(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  // Échapper le HTML
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Afficher le modal de création de groupe
  showCreateGroupModal() {
    document.getElementById('createGroupModal')?.classList.remove('hidden');
  }
}

// Instance globale
const UI = new UIManager();

// Styles pour les messages
const messageStyles = document.createElement('style');
messageStyles.textContent = `
  .conversation-item {
    padding: 12px;
    display: flex;
    align-items: center;
    gap: 12px;
    cursor: pointer;
    border-radius: 4px;
    transition: background 0.2s;
  }

  .conversation-item:hover {
    background: var(--bg-hover);
  }

  .conversation-item.active {
    background: var(--bg-hover);
  }

  .conversation-info {
    flex: 1;
    min-width: 0;
  }

  .conversation-info h4 {
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 2px;
    color: var(--text-primary);
  }

  .conversation-info p {
    font-size: 12px;
    color: var(--text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .conversation-meta {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;
  }

  .conversation-meta .time {
    font-size: 11px;
    color: var(--text-muted);
  }

  .unread-badge {
    background: var(--primary);
    color: white;
    font-size: 11px;
    font-weight: 600;
    padding: 2px 6px;
    border-radius: 10px;
  }

  .message {
    display: flex;
    gap: 8px;
    max-width: 70%;
    margin-bottom: 16px;
  }

  .message.own {
    margin-left: auto;
    flex-direction: row-reverse;
  }

  .message-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--primary);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 14px;
    font-weight: 600;
    flex-shrink: 0;
  }

  .message-content {
    background: var(--bg-secondary);
    padding: 8px 12px;
    border-radius: 12px;
    max-width: 100%;
  }

  .message.own .message-content {
    background: var(--primary);
    color: white;
  }

  .message-author {
    font-size: 12px;
    font-weight: 600;
    margin-bottom: 4px;
    color: var(--text-primary);
  }

  .message-content p {
    margin: 0;
    font-size: 14px;
    line-height: 1.4;
    word-wrap: break-word;
  }

  .message-time {
    font-size: 11px;
    color: var(--text-muted);
    margin-top: 4px;
  }

  .message.own .message-time {
    color: rgba(255,255,255,0.7);
  }

  .file-message {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px;
    background: rgba(0,0,0,0.1);
    border-radius: 4px;
  }

  .file-message a {
    color: inherit;
    text-decoration: none;
  }

  .file-message a:hover {
    text-decoration: underline;
  }

  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
`;
document.head.appendChild(messageStyles);