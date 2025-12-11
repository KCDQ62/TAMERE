const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const auth = require('../middleware/auth');

// Obtenir l'historique des messages avec un utilisateur
router.get('/user/:userId', auth, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { sender: req.user._id, recipient: req.params.userId },
        { sender: req.params.userId, recipient: req.user._id },
      ],
    })
      .populate('sender', 'username avatar')
      .populate('recipient', 'username avatar')
      .sort({ createdAt: 1 })
      .limit(100);

    res.json(messages);
  } catch (error) {
    console.error('Erreur messages user:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir l'historique des messages d'un groupe
router.get('/group/:groupId', auth, async (req, res) => {
  try {
    const messages = await Message.find({
      group: req.params.groupId,
    })
      .populate('sender', 'username avatar')
      .sort({ createdAt: 1 })
      .limit(100);

    res.json(messages);
  } catch (error) {
    console.error('Erreur messages groupe:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Marquer un message comme lu
router.put('/:messageId/read', auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    
    if (!message) {
      return res.status(404).json({ error: 'Message non trouvé' });
    }

    message.read = true;
    await message.save();

    res.json({ message: 'Message marqué comme lu' });
  } catch (error) {
    console.error('Erreur marquer lu:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;