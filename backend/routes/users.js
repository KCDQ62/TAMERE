```javascript
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');

// Obtenir le profil utilisateur
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password')
      .populate('friends', 'username email avatar status');
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Rechercher des utilisateurs
router.get('/search', auth, async (req, res) => {
  try {
    const { query } = req.query;
    
    const users = await User.find({
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
      ],
      _id: { $ne: req.user._id },
    }).select('username email avatar status').limit(20);
    
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Erreur de recherche' });
  }
});

// Envoyer une demande d'ami
router.post('/friend-request/:userId', auth, async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.userId);
    
    if (!targetUser) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Vérifier si déjà ami
    if (req.user.friends.includes(req.params.userId)) {
      return res.status(400).json({ error: 'Déjà ami avec cet utilisateur' });
    }

    // Vérifier si demande déjà envoyée
    const requestExists = targetUser.friendRequests.some(
      req => req.from.toString() === req.user._id.toString()
    );
    
    if (requestExists) {
      return res.status(400).json({ error: 'Demande déjà envoyée' });
    }

    // Ajouter la demande
    targetUser.friendRequests.push({ from: req.user._id });
    await targetUser.save();

    res.json({ message: 'Demande d\'ami envoyée' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Accepter une demande d'ami
router.post('/friend-request/:userId/accept', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const friend = await User.findById(req.params.userId);

    if (!friend) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Retirer la demande
    user.friendRequests = user.friendRequests.filter(
      req => req.from.toString() !== req.params.userId
    );

    // Ajouter aux amis mutuellement
    user.friends.push(friend._id);
    friend.friends.push(user._id);

    await user.save();
    await friend.save();

    res.json({ message: 'Ami ajouté' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir la liste d'amis
router.get('/friends', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('friends', 'username email avatar status');
    
    res.json(user.friends);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
```