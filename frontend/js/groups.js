// Gestion des groupes
class GroupsManager {
  constructor() {
    this.groups = new Map();
  }

  init() {
    this.setupModalListeners();
    this.loadGroups();
  }

  setupModalListeners() {
    // Bouton annuler
    document.getElementById('cancelGroupBtn')?.addEventListener('click', () => {
      this.hideCreateGroupModal();
    });

    // Bouton créer
    document.getElementById('confirmGroupBtn')?.addEventListener('click', () => {
      this.createGroup();
    });

    // Fermer modal en cliquant en dehors
    document.getElementById('createGroupModal')?.addEventListener('click', (e) => {
      if (e.target.id === 'createGroupModal') {
        this.hideCreateGroupModal();
      }
    });
  }

  // Charger les groupes
  async loadGroups() {
    try {
      const response = await fetch(`${API_URL}/groups`, {
        headers: Auth.getAuthHeaders()
      });

      if (response.ok) {
        const groups = await response.json();
        groups.forEach(group => {
          this.addGroupToUI(group);
        });

        // Rejoindre les groupes via socket
        const groupIds = groups.map(g => g._id);
        if (groupIds.length > 0) {
          socket.joinGroups(groupIds);
        }
      }
    } catch (error) {
      console.error('Erreur de chargement des groupes:', error);
    }
  }

  // Afficher le modal de création
  async showCreateGroupModal() {
    const modal = document.getElementById('createGroupModal');
    const usersSelect = document.getElementById('groupUsersSelect');
    
    if (!modal || !usersSelect) return;

    // Charger la liste des amis
    try {
      const response = await fetch(`${API_URL}/users/friends`, {
        headers: Auth.getAuthHeaders()
      });

      if (response.ok) {
        const friends = await response.json();
        usersSelect.innerHTML = '';

        friends.forEach(friend => {
          const userDiv = document.createElement('div');
          userDiv.className = 'user-checkbox';
          userDiv.innerHTML = `
            <label style="display: flex; align-items: center; gap: 8px; padding: 8px; cursor: pointer;">
              <input type="checkbox" value="${friend._id}" style="cursor: pointer;">
              <div class="avatar small" style="width: 24px; height: 24px; font-size: 12px;">
                ${friend.username.charAt(0).toUpperCase()}
              </div>
              <span>${friend.username}</span>
            </label>
          `;
          usersSelect.appendChild(userDiv);
        });
      }
    } catch (error) {
      console.error('Erreur de chargement des amis:', error);
    }

    modal.classList.remove('hidden');
  }

  // Masquer le modal de création
  hideCreateGroupModal() {
    const modal = document.getElementById('createGroupModal');
    if (modal) {
      modal.classList.add('hidden');
      document.getElementById('groupNameInput').value = '';
    }
  }

  // Créer un groupe
  async createGroup() {
    const nameInput = document.getElementById('groupNameInput');
    const name = nameInput.value.trim();

    if (!name) {
      UI.showNotification('Veuillez entrer un nom de groupe', 'error');
      return;
    }

    // Récupérer les membres sélectionnés
    const checkboxes = document.querySelectorAll('#groupUsersSelect input[type="checkbox"]:checked');
    const memberIds = Array.from(checkboxes).map(cb => cb.value);

    try {
      const response = await fetch(`${API_URL}/groups`, {
        method: 'POST',
        headers: Auth.getAuthHeaders(),
        body: JSON.stringify({ name, members: memberIds })
      });

      if (response.ok) {
        const group = await response.json();
        this.addGroupToUI(group);
        socket.joinGroup(group._id);
        this.hideCreateGroupModal();
        UI.showNotification('Groupe créé avec succès', 'success');
      } else {
        const error = await response.json();
        UI.showNotification(error.error || 'Erreur de création du groupe', 'error');
      }
    } catch (error) {
      console.error('Erreur de création du groupe:', error);
      UI.showNotification('Erreur de création du groupe', 'error');
    }
  }

  // Ajouter un groupe à l'interface
  addGroupToUI(group) {
    const list = document.getElementById('groupsList');
    if (!list) return;

    // Vérifier si le groupe existe déjà
    if (document.querySelector(`[data-group-id="${group._id}"]`)) {
      return;
    }

    const groupDiv = document.createElement('div');
    groupDiv.className = 'conversation-item';
    groupDiv.dataset.groupId = group._id;
    groupDiv.dataset.type = 'group';
    
    const memberCount = group.members ? group.members.length : 0;
    
    groupDiv.innerHTML = `
      <div class="avatar">${group.name.charAt(0).toUpperCase()}</div>
      <div class="conversation-info">
        <h4>${group.name}</h4>
        <p>${memberCount} membre${memberCount > 1 ? 's' : ''}</p>
      </div>
    `;

    groupDiv.addEventListener('click', () => {
      this.openGroup(group._id);
    });

    list.appendChild(groupDiv);
    this.groups.set(group._id, group);
  }

  // Ouvrir un groupe
  openGroup(groupId) {
    const group = this.groups.get(groupId);
    if (!group) return;

    // Mettre en surbrillance
    document.querySelectorAll('.conversation-item').forEach(item => {
      item.classList.remove('active');
    });
    document.querySelector(`[data-group-id="${groupId}"]`)?.classList.add('active');

    // Afficher la conversation
    UI.currentConversation = groupId;
    UI.currentConversationType = 'group';

    document.getElementById('emptyState')?.classList.add('hidden');
    document.getElementById('chatContainer')?.classList.remove('hidden');

    // Mettre à jour l'en-tête
    document.getElementById('chatName').textContent = group.name;
    document.getElementById('chatAvatar').textContent = group.name.charAt(0).toUpperCase();
    const memberCount = group.members ? group.members.length : 0;
    document.getElementById('chatStatus').textContent = `${memberCount} membre${memberCount > 1 ? 's' : ''}`;

    // Charger les messages
    this.loadGroupMessages(groupId);
  }

  // Charger les messages d'un groupe
  async loadGroupMessages(groupId) {
    try {
      const response = await fetch(`${API_URL}/messages/group/${groupId}`, {
        headers: Auth.getAuthHeaders()
      });

      if (response.ok) {
        const messages = await response.json();
        UI.displayMessages(messages);
      }
    } catch (error) {
      console.error('Erreur de chargement des messages:', error);
    }
  }

  // Ajouter un membre au groupe
  async addMember(groupId, userId) {
    try {
      const response = await fetch(`${API_URL}/groups/${groupId}/members`, {
        method: 'POST',
        headers: Auth.getAuthHeaders(),
        body: JSON.stringify({ userId })
      });

      if (response.ok) {
        UI.showNotification('Membre ajouté avec succès', 'success');
      } else {
        const error = await response.json();
        UI.showNotification(error.error || 'Erreur d\'ajout du membre', 'error');
      }
    } catch (error) {
      console.error('Erreur d\'ajout du membre:', error);
      UI.showNotification('Erreur d\'ajout du membre', 'error');
    }
  }

  // Gérer les événements socket
  handleSocketEvents() {
    socket.on('user_joined_group', (data) => {
      console.log('Utilisateur a rejoint le groupe:', data);
      if (UI.currentConversation === data.groupId) {
        UI.showNotification(`${data.username} a rejoint le groupe`, 'info');
      }
    });

    socket.on('user_left_group', (data) => {
      console.log('Utilisateur a quitté le groupe:', data);
      if (UI.currentConversation === data.groupId) {
        UI.showNotification(`${data.username} a quitté le groupe`, 'info');
      }
    });
  }
}

// Instance globale
const Groups = new GroupsManager();

// Styles pour les groupes
const groupStyles = document.createElement('style');
groupStyles.textContent = `
  .user-checkbox {
    border-bottom: 1px solid var(--border);
  }

  .user-checkbox:last-child {
    border-bottom: none;
  }

  .user-checkbox label:hover {
    background: var(--bg-hover);
  }

  .users-select {
    max-height: 300px;
    overflow-y: auto;
    margin-bottom: 16px;
    border: 1px solid var(--border);
    border-radius: 4px;
  }
`;
document.head.appendChild(groupStyles);