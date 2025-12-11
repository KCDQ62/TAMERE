// Gestion des appels audio/vidéo WebRTC
class WebRTCManager {
  constructor() {
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.currentCallType = null; // 'audio' ou 'video'
    this.currentPeerId = null;
    this.isCallActive = false;
    
    // Configuration ICE servers
    this.configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };
  }

  init() {
    this.setupSocketListeners();
    this.setupCallControls();
  }

  setupSocketListeners() {
    // Appel entrant
    socket.on('incoming_call', async (data) => {
      console.log('Appel entrant de:', data.from);
      this.handleIncomingCall(data);
    });

    // Appel accepté
    socket.on('call_answered', async (data) => {
      console.log('Appel accepté');
      await this.handleCallAnswered(data);
    });

    // Appel refusé
    socket.on('call_rejected', (data) => {
      console.log('Appel refusé');
      UI.showNotification('Appel refusé', 'warning');
      this.endCall();
    });

    // Appel terminé
    socket.on('call_ended', (data) => {
      console.log('Appel terminé');
      this.endCall();
    });

    // ICE candidate
    socket.on('ice_candidate', async (data) => {
      console.log('ICE candidate reçu');
      await this.handleIceCandidate(data);
    });
  }

  setupCallControls() {
    // Bouton fin d'appel
    document.getElementById('endCallBtn')?.addEventListener('click', () => {
      this.endCall();
      socket.endCall(this.currentPeerId);
    });

    // Bouton toggle vidéo
    document.getElementById('toggleVideoBtn')?.addEventListener('click', () => {
      this.toggleVideo();
    });

    // Bouton toggle audio
    document.getElementById('toggleAudioBtn')?.addEventListener('click', () => {
      this.toggleAudio();
    });

    // Fermer modal en cliquant en dehors
    document.getElementById('videoCallModal')?.addEventListener('click', (e) => {
      if (e.target.id === 'videoCallModal') {
        this.endCall();
      }
    });
  }

  // Démarrer un appel
  async startCall(peerId, callType = 'video') {
    try {
      this.currentPeerId = peerId;
      this.currentCallType = callType;

      // Obtenir le stream local
      await this.getLocalStream(callType === 'video');

      // Créer la connexion peer
      this.createPeerConnection();

      // Ajouter le stream local
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream);
      });

      // Créer l'offre
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: callType === 'video'
      });

      await this.peerConnection.setLocalDescription(offer);

      // Envoyer l'offre via socket
      socket.callUser(peerId, offer, callType);

      // Afficher l'interface d'appel
      this.showCallModal();
      UI.showNotification('Appel en cours...', 'info');

    } catch (error) {
      console.error('Erreur de démarrage d\'appel:', error);
      UI.showNotification('Erreur de démarrage de l\'appel', 'error');
      this.endCall();
    }
  }

  // Gérer un appel entrant
  async handleIncomingCall(data) {
    const { from, offer, callType, fromUsername } = data;

    // Demander confirmation
    const accept = confirm(`${fromUsername} vous appelle. Accepter l'appel ${callType === 'video' ? 'vidéo' : 'audio'} ?`);

    if (accept) {
      try {
        this.currentPeerId = from;
        this.currentCallType = callType;

        // Obtenir le stream local
        await this.getLocalStream(callType === 'video');

        // Créer la connexion peer
        this.createPeerConnection();

        // Ajouter le stream local
        this.localStream.getTracks().forEach(track => {
          this.peerConnection.addTrack(track, this.localStream);
        });

        // Définir la description distante
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

        // Créer la réponse
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);

        // Envoyer la réponse
        socket.answerCall(from, answer);

        // Afficher l'interface d'appel
        this.showCallModal();

      } catch (error) {
        console.error('Erreur de réponse à l\'appel:', error);
        socket.rejectCall(from);
        UI.showNotification('Erreur lors de l\'acceptation de l\'appel', 'error');
      }
    } else {
      socket.rejectCall(from);
    }
  }

  // Gérer la réponse à l'appel
  async handleCallAnswered(data) {
    try {
      const { answer } = data;
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      this.isCallActive = true;
    } catch (error) {
      console.error('Erreur lors de la réponse:', error);
    }
  }

  // Gérer ICE candidate
  async handleIceCandidate(data) {
    try {
      const { candidate } = data;
      if (this.peerConnection && candidate) {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (error) {
      console.error('Erreur ICE candidate:', error);
    }
  }

  // Créer la connexion peer
  createPeerConnection() {
    this.peerConnection = new RTCPeerConnection(this.configuration);

    // Gérer les ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.sendIceCandidate(this.currentPeerId, event.candidate);
      }
    };

    // Gérer le stream distant
    this.peerConnection.ontrack = (event) => {
      console.log('Track distant reçu');
      if (!this.remoteStream) {
        this.remoteStream = new MediaStream();
        const remoteVideo = document.getElementById('remoteVideo');
        if (remoteVideo) {
          remoteVideo.srcObject = this.remoteStream;
        }
      }
      this.remoteStream.addTrack(event.track);
    };

    // Gérer les changements d'état
    this.peerConnection.oniceconnectionstatechange = () => {
      console.log('ICE state:', this.peerConnection.iceConnectionState);
      if (this.peerConnection.iceConnectionState === 'disconnected' ||
          this.peerConnection.iceConnectionState === 'failed') {
        this.endCall();
      }
    };
  }

  // Obtenir le stream local
  async getLocalStream(video = true) {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: video ? { width: 1280, height: 720 } : false
      });

      const localVideo = document.getElementById('localVideo');
      if (localVideo) {
        localVideo.srcObject = this.localStream;
      }

      return this.localStream;
    } catch (error) {
      console.error('Erreur d\'accès média:', error);
      throw new Error('Impossible d\'accéder à la caméra/microphone');
    }
  }

  // Afficher le modal d'appel
  showCallModal() {
    const modal = document.getElementById('videoCallModal');
    if (modal) {
      modal.classList.remove('hidden');
    }
  }

  // Masquer le modal d'appel
  hideCallModal() {
    const modal = document.getElementById('videoCallModal');
    if (modal) {
      modal.classList.add('hidden');
    }
  }

  // Toggle vidéo
  toggleVideo() {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        const btn = document.getElementById('toggleVideoBtn');
        if (btn) {
          btn.style.opacity = videoTrack.enabled ? '1' : '0.5';
        }
        socket.toggleVideo(this.currentPeerId, videoTrack.enabled);
      }
    }
  }

  // Toggle audio
  toggleAudio() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        const btn = document.getElementById('toggleAudioBtn');
        if (btn) {
          btn.style.opacity = audioTrack.enabled ? '1' : '0.5';
        }
        socket.toggleAudio(this.currentPeerId, audioTrack.enabled);
      }
    }
  }

  // Terminer l'appel
  endCall() {
    // Arrêter les tracks locaux
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    // Arrêter les tracks distants
    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach(track => track.stop());
      this.remoteStream = null;
    }

    // Fermer la connexion peer
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    // Réinitialiser les vidéos
    const localVideo = document.getElementById('localVideo');
    const remoteVideo = document.getElementById('remoteVideo');
    if (localVideo) localVideo.srcObject = null;
    if (remoteVideo) remoteVideo.srcObject = null;

    // Masquer le modal
    this.hideCallModal();

    // Réinitialiser l'état
    this.currentPeerId = null;
    this.currentCallType = null;
    this.isCallActive = false;
  }
}

// Instance globale
const WebRTC = new WebRTCManager();