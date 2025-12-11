// Gestion de l'authentification côté client
class AuthManager {
  constructor() {
    this.token = null;
    this.user = null;
  }

  // Vérifier si l'utilisateur est authentifié
  isAuthenticated() {
    this.token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    // Si pas de token ou pas d'utilisateur, retourner false
    if (!this.token || !userStr) {
      return false;
    }
    
    try {
      this.user = JSON.parse(userStr);
      return !!(this.token && this.user && this.user.id);
    } catch (e) {
      // Si le JSON est corrompu, nettoyer et retourner false
      console.error('User data corrompu:', e);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return false;
    }
  }

  // Obtenir le token
  getToken() {
    return localStorage.getItem('token');
  }

  // Obtenir l'utilisateur
  getUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  // Obtenir les headers d'authentification
  getAuthHeaders() {
    return {
      'Authorization': `Bearer ${this.getToken()}`,
      'Content-Type': 'application/json'
    };
  }

  // Obtenir le profil depuis l'API
  async getProfile() {
    try {
      const response = await fetch(`${API_URL}/users/me`, {
        headers: this.getAuthHeaders()
      });

      if (response.ok) {
        const profile = await response.json();
        // Mettre à jour le localStorage
        localStorage.setItem('user', JSON.stringify({
          id: profile._id,
          username: profile.username,
          email: profile.email,
          avatar: profile.avatar
        }));
        return profile;
      } else {
        throw new Error('Erreur de récupération du profil');
      }
    } catch (error) {
      console.error('Erreur getProfile:', error);
      throw error;
    }
  }

  // Déconnexion
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
  }

  // Connexion
  async login(email, password) {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        this.token = data.token;
        this.user = data.user;
        return { success: true, user: data.user };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      return { success: false, error: 'Erreur de connexion au serveur' };
    }
  }

  // Inscription
  async register(username, email, password) {
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, email, password })
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        this.token = data.token;
        this.user = data.user;
        return { success: true, user: data.user };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      return { success: false, error: 'Erreur de connexion au serveur' };
    }
  }

  // Vérifier la validité du token
  async verifyToken() {
    if (!this.isAuthenticated()) {
      return false;
    }

    try {
      const response = await fetch(`${API_URL}/users/me`, {
        headers: this.getAuthHeaders()
      });

      if (response.ok) {
        return true;
      } else {
        // Token invalide, déconnecter
        this.logout();
        return false;
      }
    } catch (error) {
      console.error('Erreur de vérification du token:', error);
      return false;
    }
  }

  // Mettre à jour le profil utilisateur
  async updateProfile(updates) {
    try {
      const response = await fetch(`${API_URL}/users/me`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        const updatedUser = await response.json();
        // Mettre à jour le localStorage
        const currentUser = this.getUser();
        const newUser = { ...currentUser, ...updatedUser };
        localStorage.setItem('user', JSON.stringify(newUser));
        this.user = newUser;
        return { success: true, user: newUser };
      } else {
        const error = await response.json();
        return { success: false, error: error.error };
      }
    } catch (error) {
      return { success: false, error: 'Erreur de mise à jour du profil' };
    }
  }
}

// Instance globale
const Auth = new AuthManager();