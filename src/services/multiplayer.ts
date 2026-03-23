import { io, Socket } from 'socket.io-client';

type SignalPayload = {
  target: string;
  caller?: string;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidate;
};

export type NetplayStatus = 'disconnected' | 'searching' | 'connecting' | 'connected' | 'reconnecting' | 'error';

export class MultiplayerService {
  private socket: Socket | null = null;
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private roomId: string | null = null;
  private userId: string | null = null;
  
  private statusCallback: ((status: NetplayStatus) => void) | null = null;
  private onInputCallback: ((input: any) => void) | null = null;
  private onLatencyCallback: ((ms: number) => void) | null = null;

  // Latency & Sync Tracking
  private pingInterval: number | null = null;
  private lastPingTime: number = 0;
  private currentLatency: number = 0;

  // ICE Servers (STUN/TURN)
  private rtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:global.stun.twilio.com:3478' },
      // Note: In a real production environment, you MUST use a paid TURN server 
      // (like Twilio, Xirsys, or Metered) because public TURN servers are unreliable.
      // This is a placeholder for where the TURN server config goes.
      { 
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      },
      { 
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      }
    ]
  };

  // Data Channel Config (UDP-like for low latency gaming)
  private dataChannelOptions: RTCDataChannelInit = {
    ordered: false, // Don't wait for dropped packets (reduces head-of-line blocking)
    maxRetransmits: 0 // Don't retransmit (we only care about the latest input)
  };

  constructor() {}

  private setStatus(status: NetplayStatus) {
    if (this.statusCallback) this.statusCallback(status);
  }

  public onStatusChange(callback: (status: NetplayStatus) => void) {
    this.statusCallback = callback;
  }

  public onLatencyUpdate(callback: (ms: number) => void) {
    this.onLatencyCallback = callback;
  }

  // --- MATCHMAKING ---
  public joinMatchmaking(gameId: string, userId: string, onMatchFound: (roomId: string, opponentId: string, isHost: boolean) => void) {
    this.setStatus('searching');
    
    if (!this.socket) {
      this.socket = io({ transports: ['websocket'] }); // Force WS for lower latency
      this.setupWebRTCListeners();
    }
    
    this.userId = userId;

    this.socket.on('match-found', (data) => {
      this.roomId = data.roomId;
      onMatchFound(data.roomId, data.opponentId, data.isHost);
      this.setStatus('connecting');
      this.socket?.emit('join-room', data.roomId, userId);
    });

    this.socket.emit('join-matchmaking', { gameId, userId });
  }

  public leaveMatchmaking() {
    if (this.socket) {
      this.socket.emit('leave-matchmaking');
      this.socket.off('match-found');
      this.setStatus('disconnected');
    }
  }

  // --- ROOM CONNECTION ---
  public connect(roomId: string, userId: string) {
    this.roomId = roomId;
    this.userId = userId;
    this.setStatus('connecting');

    if (!this.socket) {
      this.socket = io({ transports: ['websocket'] });
      this.setupWebRTCListeners();
    }

    this.socket.on('connect', () => {
      console.log('[Netplay] Conectado al servidor de señalización');
      this.socket?.emit('join-room', roomId, userId);
    });
  }

  private setupWebRTCListeners() {
    this.socket?.on('user-connected', (remoteUserId: string) => {
      console.log('[Netplay] Oponente conectado:', remoteUserId);
      this.initiatePeerConnection(remoteUserId);
    });

    this.socket?.on('peer-disconnected', (remoteUserId: string) => {
      console.log('[Netplay] Oponente desconectado (Grace period iniciado):', remoteUserId);
      this.setStatus('reconnecting');
    });

    this.socket?.on('peer-reconnected', (remoteUserId: string) => {
      console.log('[Netplay] Oponente reconectado:', remoteUserId);
      this.setStatus('connected');
    });

    this.socket?.on('room-closed', () => {
      console.log('[Netplay] Sala cerrada por timeout');
      this.disconnect();
      this.setStatus('error');
    });

    this.socket?.on('offer', async (payload: SignalPayload) => {
      console.log('[Netplay] Oferta SDP recibida');
      await this.handleOffer(payload);
    });

    this.socket?.on('answer', async (payload: SignalPayload) => {
      console.log('[Netplay] Respuesta SDP recibida');
      await this.handleAnswer(payload);
    });

    this.socket?.on('ice-candidate', async (payload: SignalPayload) => {
      await this.handleIceCandidate(payload);
    });
  }

  // --- WEBRTC PEER CONNECTION ---
  private async initiatePeerConnection(targetUserId: string) {
    this.peerConnection = new RTCPeerConnection(this.rtcConfig);

    // Create Data Channel (Host)
    this.dataChannel = this.peerConnection.createDataChannel("game-inputs", this.dataChannelOptions);
    this.setupDataChannel(this.dataChannel);

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket?.emit('ice-candidate', { target: targetUserId, candidate: event.candidate });
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      console.log('[Netplay] Estado de conexión:', this.peerConnection?.connectionState);
      if (this.peerConnection?.connectionState === 'connected') {
        this.setStatus('connected');
        this.socket?.emit('peer-ready', this.roomId, this.userId);
      } else if (this.peerConnection?.connectionState === 'disconnected' || this.peerConnection?.connectionState === 'failed') {
        this.setStatus('reconnecting');
      }
    };

    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);

    this.socket?.emit('offer', { target: targetUserId, caller: this.userId, sdp: offer });
  }

  private async handleOffer(payload: SignalPayload) {
    this.peerConnection = new RTCPeerConnection(this.rtcConfig);

    this.peerConnection.ondatachannel = (event) => {
      this.setupDataChannel(event.channel);
    };

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket?.emit('ice-candidate', { target: payload.caller!, candidate: event.candidate });
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      if (this.peerConnection?.connectionState === 'connected') {
        this.setStatus('connected');
        this.socket?.emit('peer-ready', this.roomId, this.userId);
      } else if (this.peerConnection?.connectionState === 'disconnected' || this.peerConnection?.connectionState === 'failed') {
        this.setStatus('reconnecting');
      }
    };

    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(payload.sdp!));
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);

    this.socket?.emit('answer', { target: payload.caller!, sdp: answer });
  }

  private async handleAnswer(payload: SignalPayload) {
    await this.peerConnection?.setRemoteDescription(new RTCSessionDescription(payload.sdp!));
  }

  private async handleIceCandidate(payload: SignalPayload) {
    try {
      if (this.peerConnection?.remoteDescription) {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(payload.candidate!));
      }
    } catch (e) {
      console.error('[Netplay] Error agregando ICE candidate', e);
    }
  }

  // --- DATA CHANNEL & SYNC ---
  private setupDataChannel(channel: RTCDataChannel) {
    this.dataChannel = channel;
    
    channel.onopen = () => {
      console.log('[Netplay] Data channel abierto (UDP Mode)');
      this.startPingInterval();
    };

    channel.onclose = () => {
      console.log('[Netplay] Data channel cerrado');
      this.stopPingInterval();
    };

    channel.onmessage = (event) => {
      // Handle Ping/Pong for latency tracking
      if (typeof event.data === 'string' && event.data.startsWith('PING:')) {
        this.dataChannel?.send(`PONG:${event.data.split(':')[1]}`);
        return;
      }
      if (typeof event.data === 'string' && event.data.startsWith('PONG:')) {
        const timestamp = parseInt(event.data.split(':')[1], 10);
        this.currentLatency = Date.now() - timestamp;
        if (this.onLatencyCallback) this.onLatencyCallback(this.currentLatency);
        return;
      }

      // Handle Game Inputs
      try {
        const data = JSON.parse(event.data);
        if (this.onInputCallback) {
          this.onInputCallback(data);
        }
      } catch (e) {
        // Ignore non-JSON messages
      }
    };
  }

  private startPingInterval() {
    this.stopPingInterval();
    this.pingInterval = window.setInterval(() => {
      if (this.dataChannel?.readyState === 'open') {
        this.lastPingTime = Date.now();
        this.dataChannel.send(`PING:${this.lastPingTime}`);
      }
    }, 2000); // Ping every 2 seconds
  }

  private stopPingInterval() {
    if (this.pingInterval !== null) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  public onInput(callback: (input: any) => void) {
    this.onInputCallback = callback;
  }

  public sendInput(input: any) {
    if (this.dataChannel?.readyState === 'open') {
      // Add timestamp to input for rollback/lockstep logic on the receiver side
      const payload = {
        ...input,
        _ts: Date.now()
      };
      this.dataChannel.send(JSON.stringify(payload));
    }
  }

  public getLatency(): number {
    return this.currentLatency;
  }

  // --- CHAT ---
  public sendChatMessage(room: string, message: { user: string, text: string }) {
    this.socket?.emit('chat-message', { room, ...message });
  }

  public onChatMessage(callback: (message: { user: string, text: string }) => void) {
    this.socket?.on('chat-message', callback);
  }

  // --- CLEANUP ---
  public disconnect() {
    this.stopPingInterval();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }
    this.roomId = null;
    this.userId = null;
    this.setStatus('disconnected');
    console.log('[Netplay] Desconectado y limpiado');
  }
}

export const multiplayer = new MultiplayerService();
