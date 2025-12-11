// Gestion des messages
class MessagingManager {
  constructor() {
    this.typingTimeout = null;
  }

  init() {
    this.setupSocketListeners();
    this.setupTypingDetection();
  }

  setupSocketListeners() {
    // Nouveau message privé reçu
    socket.on('new_message', (message) => {
      console.log('Nouveau message reçu:', message);
      
      // Ajouter le message à l'interface
      if (UI.currentConversation === message.sender._id || 
          UI.currentConversation === message.recipient._id) {
        UI.addMessageToUI(message);
        UI.scrollToBottom();
        
        // Marquer comme lu si la conversation est ouverte
        if (UI.currentConversation === message.sender._id) {
          socket.markAsRead(message._id);
        }
      }

      // Afficher une notification si pas dans la conversation
      if (UI.currentConversation !== message.sender._id) {
        this.showMessageNotification(message);
      }

      // Jouer un son
      this.playNotificationSound();
    });

    // Nouveau message de groupe reçu
    socket.on('new_group_message', (message) => {
      console.log('Nouveau message de groupe reçu:', message);
      
      // Ajouter le message à l'interface
      if (UI.currentConversation === message.group && 
          UI.currentConversationType === 'group') {
        UI.addMessageToUI(message);
        UI.scrollToBottom();
      }

      // Afficher une notification
      if (UI.currentConversation !== message.group) {
        this.showGroupMessageNotification(message);
      }

      // Jouer un son
      this.playNotificationSound();
    });

    // Message envoyé confirmé
    socket.on('message_sent', (message) => {
      console.log('Message envoyé:', message);
      
      // Ajouter le message à l'interface si on est dans la bonne conversation
      if ((UI.currentConversation === message.recipient?._id || 
           UI.currentConversation === message.group) &&
          !document.querySelector(`[data-id="${message._id}"]`)) {
        UI.addMessageToUI(message);
        UI.scrollToBottom();
      }
    });

    // Utilisateur en train d'écrire
    socket.on('user_typing', (data) => {
      if (UI.currentConversation === data.userId) {
        if (data.isTyping) {
          UI.showTypingIndicator(data.username);
        } else {
          UI.hideTypingIndicator();
        }
      }
    });

    // Message lu
    socket.on('message_read', (data) => {
      const messageEl = document.querySelector(`[data-id="${data.messageId}"]`);
      if (messageEl) {
        // Ajouter un indicateur de lecture
        const readIndicator = messageEl.querySelector('.read-indicator');
        if (!readIndicator) {
          const indicator = document.createElement('span');
          indicator.className = 'read-indicator';
          indicator.innerHTML = '✓✓';
          indicator.style.cssText = `
            color: var(--success);
            font-size: 10px;
            margin-left: 4px;
          `;
          messageEl.querySelector('.message-time')?.appendChild(indicator);
        }
      }
    });
  }

  setupTypingDetection() {
    const messageInput = document.getElementById('messageInput');
    
    if (!messageInput) return;

    messageInput.addEventListener('input', () => {
      if (!UI.currentConversation || UI.currentConversationType === 'group') return;

      // Indiquer qu'on tape
      socket.sendTyping(UI.currentConversation, true);

      // Annuler le timeout précédent
      if (this.typingTimeout) {
        clearTimeout(this.typingTimeout);
      }

      // Indiquer qu'on a arrêté de taper après 2 secondes
      this.typingTimeout = setTimeout(() => {
        socket.sendTyping(UI.currentConversation, false);
      }, 2000);
    });
  }

  // Afficher une notification de message
  showMessageNotification(message) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`Nouveau message de ${message.sender.username}`, {
        body: message.content.substring(0, 100),
        icon: '/icon.png'
      });
    }
  }

  // Afficher une notification de message de groupe
  showGroupMessageNotification(message) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`${message.sender.username} dans un groupe`, {
        body: message.content.substring(0, 100),
        icon: '/icon.png'
      });
    }
  }

  // Jouer un son de notification
  playNotificationSound() {
    try {
      const audio = new Audio('data:audio/wav;base64,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');
      audio.volume = 0.3;
      audio.play().catch(() => {
        // Ignorer les erreurs de lecture
      });
    } catch (error) {
      // Ignorer les erreurs
    }
  }

  // Demander la permission pour les notifications
  requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }
}

// Instance globale
const Messaging = new MessagingManager();