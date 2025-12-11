const express = require('express');
const router = express.Router();
const Group = require('../models/Group');
const auth = require('../middleware/auth');

// Créer un groupe
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, members } = req.body;

    const group = new Group({
      name,
      description,
      creator: req.user._id,
      members: [
        {
          user: req.user._id,
          role: 'admin',
        },
        ...(members || []).map(userId => ({
          user: userId,
          role: 'member',
        })),
      ],
    });

    await group.save();
    await group.populate('members.user', 'username email avatar');

    res.status(201).json(group);
  } catch (error) {
    console.error('Erreur création groupe:', error);
    res.status(500).json({ error: 'Erreur lors de la création du groupe' });
  }
});

// Obtenir tous les groupes de l'utilisateur
router.get('/', auth, async (req, res) => {
  try {
    const groups = await Group.find({
      'members.user': req.user._id,
    }).populate('members.user', 'username email avatar');

    res.json(groups);
  } catch (error) {
    console.error('Erreur liste groupes:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir un groupe spécifique
router.get('/:groupId', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId)
      .populate('members.user', 'username email avatar')
      .populate('creator', 'username email avatar');

    if (!group) {
      return res.status(404).json({ error: 'Groupe non trouvé' });
    }

    // Vérifier que l'utilisateur est membre
    const isMember = group.members.some(
      m => m.user._id.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    res.json(group);
  } catch (error) {
    console.error('Erreur récupération groupe:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Ajouter un membre au groupe
router.post('/:groupId/members', auth, async (req, res) => {
  try {
    const { userId } = req.body;
    const group = await Group.findById(req.params.groupId);

    if (!group) {
      return res.status(404).json({ error: 'Groupe non trouvé' });
    }

    // Vérifier si l'utilisateur est admin
    const isAdmin = group.members.some(
      m => m.user.toString() === req.user._id.toString() && m.role === 'admin'
    );

    if (!isAdmin) {
      return res.status(403).json({ error: 'Permission refusée' });
    }

    // Vérifier si le membre existe déjà
    const memberExists = group.members.some(
      m => m.user.toString() === userId
    );

    if (memberExists) {
      return res.status(400).json({ error: 'Membre déjà dans le groupe' });
    }

    group.members.push({ user: userId, role: 'member' });
    await group.save();
    await group.populate('members.user', 'username email avatar');

    res.json(group);
  } catch (error) {
    console.error('Erreur ajout membre:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Retirer un membre du groupe
router.delete('/:groupId/members/:userId', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);

    if (!group) {
      return res.status(404).json({ error: 'Groupe non trouvé' });
    }

    // Vérifier si l'utilisateur est admin
    const isAdmin = group.members.some(
      m => m.user.toString() === req.user._id.toString() && m.role === 'admin'
    );

    if (!isAdmin && req.user._id.toString() !== req.params.userId) {
      return res.status(403).json({ error: 'Permission refusée' });
    }

    // Retirer le membre
    group.members = group.members.filter(
      m => m.user.toString() !== req.params.userId
    );

    await group.save();
    await group.populate('members.user', 'username email avatar');

    res.json(group);
  } catch (error) {
    console.error('Erreur retrait membre:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;