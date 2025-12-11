// Configuration de l'URL de l'API
const API_URL = 'http://localhost:3000/api';
const SOCKET_URL = 'http://localhost:3000';

// Gestionnaire de connexion Socket.IO
class SocketManager {
  constructor() {
    this.socket = null;
    this.eventHandlers = new Map();
  }

  // Se connecter au serveur WebSocket
  connect() {
    const token = Auth.getToken();
    
    if (!token) {
      console.error('Token manquant pour la connexion WebSocket');
      return;
    }

    this.socket = io(SOCKET_URL, {
      auth: { token }
    });

    // Événements de connexion
    this.socket.on('connect', () => {
      console.log('✅ Connecté au serveur WebSocket');
      this.trigger('connected');
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Déconnecté du serveur WebSocket');
      this.trigger('disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Erreur de connexion WebSocket:', error);
      this.trigger('error', error);
    });

    // Événements de messages
    this.socket.on('new_message', (message) => {
      this.trigger('new_message', message);
    });

    this.socket.on('new_group_message', (message) => {
      this.trigger('new_group_message', message);
    });

    this.socket.on('message_sent', (message) => {
      this.trigger('message_sent', message);
    });

    this.socket.on('user_typing', (data) => {
      this.trigger('user_typing', data);
    });

    this.socket.on('message_read', (data) => {
      this.trigger('message_read', data);
    });

    // Événements de statut
    this.socket.on('friend_status_changed', (data) => {
      this.trigger('friend_status_changed', data);
    });

    // Événements de groupe
    this.socket.on('user_joined_group', (data) => {
      this.trigger('user_joined_group', data);
    });

    this.socket.on('user_left_group', (data) => {
      this.trigger('user_left_group', data);
    });

    // Événements WebRTC
    this.socket.on('incoming_call', (data) => {
      this.trigger('incoming_call', data);
    });

    this.socket.on('call_answered', (data) => {
      this.trigger('call_answered', data);
    });

    this.socket.on('call_rejected', (data) => {
      this.trigger('call_rejected', data);
    });

    this.socket.on('call_ended', (data) => {
      this.trigger('call_ended', data);
    });

    this.socket.on('ice_candidate', (data) => {
      this.trigger('ice_candidate', data);
    });
  }

  // Se déconnecter
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Enregistrer un gestionnaire d'événements
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }

  // Déclencher un événement
  trigger(event, data) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }

  // Émettre un événement
  emit(event, data) {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }

  // Envoyer un message privé
  sendPrivateMessage(recipientId, content, type = 'text', fileData = null) {
    this.emit('private_message', {
      recipientId,
      content,
      type,
      ...(fileData || {})
    });
  }

  // Envoyer un message de groupe
  sendGroupMessage(groupId, content, type = 'text', fileData = null) {
    this.emit('group_message', {
      groupId,
      content,
      type,
      ...(fileData || {})
    });
  }

  // Indiquer que l'utilisateur tape
  sendTyping(recipientId, isTyping) {
    this.emit('typing', { recipientId, isTyping });
  }

  // Marquer un message comme lu
  markAsRead(messageId) {
    this.emit('mark_read', { messageId });
  }

  // Rejoindre les groupes
  joinGroups(groupIds) {
    this.emit('join_groups', groupIds);
  }

  // Rejoindre un groupe
  joinGroup(groupId) {
    this.emit('join_group', groupId);
  }

  // Quitter un groupe
  leaveGroup(groupId) {
    this.emit('leave_group', groupId);
  }

  // Mettre à jour le statut
  updateOnlineStatus(status) {
    this.emit('update_status', status);
  }

  // WebRTC - Appeler un utilisateur
  callUser(userId, offer, callType) {
    this.emit('call_user', { to: userId, offer, callType });
  }

  // WebRTC - Répondre à un appel
  answerCall(userId, answer) {
    this.emit('answer_call', { to: userId, answer });
  }

  // WebRTC - Refuser un appel
  rejectCall(userId) {
    this.emit('reject_call', { to: userId });
  }

  // WebRTC - Terminer un appel
  endCall(userId) {
    this.emit('end_call', { to: userId });
  }

  // WebRTC - Envoyer un ICE candidate
  sendIceCandidate(userId, candidate) {
    this.emit('ice_candidate', { to: userId, candidate });
  }

  // WebRTC - Basculer la vidéo
  toggleVideo(userId, enabled) {
    this.emit('toggle_video', { to: userId, enabled });
  }

  // WebRTC - Basculer l'audio
  toggleAudio(userId, enabled) {
    this.emit('toggle_audio', { to: userId, enabled });
  }
}

// Instance globale
const socket = new SocketManager();