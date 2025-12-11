const { verifyToken } = require('../config/jwt');
const User = require('../models/User');
const Message = require('../models/Message');

module.exports = (io) => {
  // Map pour stocker les connexions utilisateurs
  const users = new Map(); // userId -> socketId
  const sockets = new Map(); // socketId -> userId

  // Middleware d'authentification
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = verifyToken(token);
      
      if (!decoded) {
        return next(new Error('Invalid token'));
      }

      const user = await User.findById(decoded.id);
      
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.userId = user._id.toString();
      socket.username = user.username;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`✅ Utilisateur connecté: ${socket.username} (${socket.userId})`);

    // Enregistrer la connexion
    users.set(socket.userId, socket.id);
    sockets.set(socket.id, socket.userId);

    // Mettre à jour le statut à en ligne
    updateUserStatus(socket.userId, 'online');

    // Notifier les amis que l'utilisateur est en ligne
    notifyFriendsStatus(socket.userId, 'online');

    // Message privé
    socket.on('private_message', async (data) => {
      try {
        const { recipientId, content, type = 'text', fileUrl, fileName, fileSize } = data;

        // Créer le message
        const message = new Message({
          sender: socket.userId,
          recipient: recipientId,
          content,
          type,
          fileUrl,
          fileName,
          fileSize
        });

        await message.save();
        await message.populate('sender', 'username avatar');
        await message.populate('recipient', 'username avatar');

        // Envoyer au destinataire
        const recipientSocketId = users.get(recipientId);
        if (recipientSocketId) {
          io.to(recipientSocketId).emit('new_message', message);
        }

        // Confirmer l'envoi à l'expéditeur
        socket.emit('message_sent', message);

      } catch (error) {
        console.error('Erreur message privé:', error);
        socket.emit('error', { message: 'Erreur d\'envoi du message' });
      }
    });

    // Message de groupe
    socket.on('group_message', async (data) => {
      try {
        const { groupId, content, type = 'text', fileUrl, fileName, fileSize } = data;

        // Créer le message
        const message = new Message({
          sender: socket.userId,
          group: groupId,
          content,
          type,
          fileUrl,
          fileName,
          fileSize
        });

        await message.save();
        await message.populate('sender', 'username avatar');

        // Envoyer à tous les membres du groupe
        io.to(`group-${groupId}`).emit('new_group_message', message);

        // Confirmer l'envoi
        socket.emit('message_sent', message);

      } catch (error) {
        console.error('Erreur message de groupe:', error);
        socket.emit('error', { message: 'Erreur d\'envoi du message' });
      }
    });

    // Indicateur de frappe
    socket.on('typing', (data) => {
      const { recipientId, isTyping } = data;
      const recipientSocketId = users.get(recipientId);
      
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('user_typing', {
          userId: socket.userId,
          username: socket.username,
          isTyping
        });
      }
    });

    // Marquer comme lu
    socket.on('mark_read', async (data) => {
      try {
        const { messageId } = data;
        const message = await Message.findById(messageId);
        
        if (message && message.recipient.toString() === socket.userId) {
          message.read = true;
          await message.save();

          // Notifier l'expéditeur
          const senderSocketId = users.get(message.sender.toString());
          if (senderSocketId) {
            io.to(senderSocketId).emit('message_read', {
              messageId,
              readBy: socket.userId
            });
          }
        }
      } catch (error) {
        console.error('Erreur mark_read:', error);
      }
    });

    // Rejoindre des groupes
    socket.on('join_groups', (groupIds) => {
      groupIds.forEach(groupId => {
        socket.join(`group-${groupId}`);
      });
      console.log(`${socket.username} a rejoint ${groupIds.length} groupes`);
    });

    // Rejoindre un groupe
    socket.on('join_group', (groupId) => {
      socket.join(`group-${groupId}`);
      socket.to(`group-${groupId}`).emit('user_joined_group', {
        userId: socket.userId,
        username: socket.username,
        groupId
      });
    });

    // Quitter un groupe
    socket.on('leave_group', (groupId) => {
      socket.leave(`group-${groupId}`);
      socket.to(`group-${groupId}`).emit('user_left_group', {
        userId: socket.userId,
        username: socket.username,
        groupId
      });
    });

    // Mise à jour du statut
    socket.on('update_status', async (status) => {
      await updateUserStatus(socket.userId, status);
      notifyFriendsStatus(socket.userId, status);
    });

    // ===== WebRTC Signaling =====

    // Appeler un utilisateur
    socket.on('call_user', (data) => {
      const { to, offer, callType } = data;
      const recipientSocketId = users.get(to);
      
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('incoming_call', {
          from: socket.userId,
          fromUsername: socket.username,
          offer,
          callType
        });
      }
    });

    // Répondre à un appel
    socket.on('answer_call', (data) => {
      const { to, answer } = data;
      const recipientSocketId = users.get(to);
      
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('call_answered', {
          from: socket.userId,
          answer
        });
      }
    });

    // Refuser un appel
    socket.on('reject_call', (data) => {
      const { to } = data;
      const recipientSocketId = users.get(to);
      
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('call_rejected', {
          from: socket.userId
        });
      }
    });

    // Terminer un appel
    socket.on('end_call', (data) => {
      const { to } = data;
      const recipientSocketId = users.get(to);
      
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('call_ended', {
          from: socket.userId
        });
      }
    });

    // ICE candidate
    socket.on('ice_candidate', (data) => {
      const { to, candidate } = data;
      const recipientSocketId = users.get(to);
      
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('ice_candidate', {
          from: socket.userId,
          candidate
        });
      }
    });

    // Toggle vidéo
    socket.on('toggle_video', (data) => {
      const { to, enabled } = data;
      const recipientSocketId = users.get(to);
      
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('video_toggled', {
          from: socket.userId,
          enabled
        });
      }
    });

    // Toggle audio
    socket.on('toggle_audio', (data) => {
      const { to, enabled } = data;
      const recipientSocketId = users.get(to);
      
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('audio_toggled', {
          from: socket.userId,
          enabled
        });
      }
    });

    // Déconnexion
    socket.on('disconnect', async () => {
      console.log(`❌ Utilisateur déconnecté: ${socket.username}`);
      
      // Retirer de la map
      users.delete(socket.userId);
      sockets.delete(socket.id);

      // Mettre à jour le statut à hors ligne
      await updateUserStatus(socket.userId, 'offline');
      notifyFriendsStatus(socket.userId, 'offline');
    });
  });

  // Fonctions auxiliaires
  async function updateUserStatus(userId, status) {
    try {
      await User.findByIdAndUpdate(userId, { status });
    } catch (error) {
      console.error('Erreur mise à jour statut:', error);
    }
  }

  async function notifyFriendsStatus(userId, status) {
    try {
      const user = await User.findById(userId).populate('friends', '_id');
      
      if (user && user.friends) {
        user.friends.forEach(friend => {
          const friendSocketId = users.get(friend._id.toString());
          if (friendSocketId) {
            io.to(friendSocketId).emit('friend_status_changed', {
              userId,
              status
            });
          }
        });
      }
    } catch (error) {
      console.error('Erreur notification amis:', error);
    }
  }
};