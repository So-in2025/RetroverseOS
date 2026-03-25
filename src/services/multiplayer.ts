import { supabase } from './supabase';
import { sentinel } from './sentinel';

type SignalPayload = {
  target: string;
  caller?: string;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidate;
};

export type NetplayStatus = 'disconnected' | 'searching' | 'connecting' | 'connected' | 'reconnecting' | 'error';

export class MultiplayerService {
  private channel: any = null;
  private matchmakingChannel: any = null;
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private roomId: string | null = null;
  private userId: string | null = null;
  private isHost: boolean = false;
  
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
      {
        urls: 'turn:global.turn.twilio.com:3478?transport=udp',
        username: 'retroverse_guest', // Placeholder for production
        credential: 'guest_password'
      },
      {
        urls: 'turn:global.turn.twilio.com:3478?transport=tcp',
        username: 'retroverse_guest',
        credential: 'guest_password'
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
    sentinel.logMultiplayer(status);
  }

  public onStatusChange(callback: (status: NetplayStatus) => void) {
    this.statusCallback = callback;
  }

  public onLatencyUpdate(callback: (ms: number) => void) {
    this.onLatencyCallback = callback;
  }

  // --- ROOM CONNECTION ---
  public async connect(roomId: string, userId: string, isHost: boolean = true) {
    if (!supabase) {
      console.warn('Supabase not initialized');
      return;
    }
    
    this.roomId = roomId;
    this.userId = userId;
    this.isHost = isHost;
    this.setStatus('connecting');
    sentinel.logMultiplayer('connecting', { roomId, userId, isHost });
    console.log(`[Netplay] Conectando a sala ${roomId} como ${userId} (Host: ${isHost})`);

    this.channel = supabase.channel(`room:${roomId}`, {
      config: {
        broadcast: { ack: true },
        presence: { key: userId }
      }
    });

    this.setupWebRTCListeners();

    this.channel.subscribe(async (status: string) => {
      if (status === 'SUBSCRIBED') {
        console.log('[Netplay] Conectado al canal de Supabase');
        await this.channel.track({ user_id: userId, joined_at: new Date().toISOString() });
      }
    });
  }

  private setupWebRTCListeners() {
    this.channel
      .on('presence', { event: 'join' }, ({ newPresences }: any) => {
        newPresences.forEach((presence: any) => {
          if (presence.user_id !== this.userId && this.isHost) {
            console.log('[Netplay] Oponente conectado, iniciando WebRTC:', presence.user_id);
            this.initiatePeerConnection(presence.user_id);
          }
        });
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }: any) => {
        leftPresences.forEach((presence: any) => {
          if (presence.user_id !== this.userId) {
            console.log('[Netplay] Oponente desconectado:', presence.user_id);
            this.setStatus('reconnecting');
          }
        });
      })
      .on('broadcast', { event: 'signal' }, async ({ payload }: any) => {
        if (payload.target !== this.userId) return; // Not for me

        if (payload.sdp) {
          if (payload.sdp.type === 'offer') {
            console.log('[Netplay] Oferta SDP recibida');
            await this.handleOffer(payload);
          } else if (payload.sdp.type === 'answer') {
            console.log('[Netplay] Respuesta SDP recibida');
            await this.handleAnswer(payload);
          }
        } else if (payload.candidate) {
          await this.handleIceCandidate(payload);
        }
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
        this.channel.send({
          type: 'broadcast',
          event: 'signal',
          payload: { target: targetUserId, caller: this.userId, candidate: event.candidate }
        });
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      console.log('[Netplay] Estado de conexión:', this.peerConnection?.connectionState);
      if (this.peerConnection?.connectionState === 'connected') {
        this.setStatus('connected');
      } else if (this.peerConnection?.connectionState === 'disconnected' || this.peerConnection?.connectionState === 'failed') {
        this.setStatus('reconnecting');
      }
    };

    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);

    this.channel.send({
      type: 'broadcast',
      event: 'signal',
      payload: { target: targetUserId, caller: this.userId, sdp: offer }
    });
  }

  private async handleOffer(payload: SignalPayload) {
    this.peerConnection = new RTCPeerConnection(this.rtcConfig);

    this.peerConnection.ondatachannel = (event) => {
      this.setupDataChannel(event.channel);
    };

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.channel.send({
          type: 'broadcast',
          event: 'signal',
          payload: { target: payload.caller!, caller: this.userId, candidate: event.candidate }
        });
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      if (this.peerConnection?.connectionState === 'connected') {
        this.setStatus('connected');
      } else if (this.peerConnection?.connectionState === 'disconnected' || this.peerConnection?.connectionState === 'failed') {
        this.setStatus('reconnecting');
      }
    };

    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(payload.sdp!));
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);

    this.channel.send({
      type: 'broadcast',
      event: 'signal',
      payload: { target: payload.caller!, caller: this.userId, sdp: answer }
    });
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

  // --- MATCHMAKING ---
  public async joinMatchmaking(gameId: string, userId: string, onMatch: (roomId: string, opponentId: string, isHost: boolean) => void) {
    if (!supabase) {
      console.warn('Supabase not initialized');
      return;
    }
    this.userId = userId;
    this.setStatus('searching');
    
    // Create a matchmaking channel for this game
    const matchmakingChannel = supabase.channel(`matchmaking:${gameId}`, {
      config: {
        presence: { key: userId }
      }
    });

    matchmakingChannel.on('presence', { event: 'sync' }, () => {
      const state = matchmakingChannel.presenceState();
      const users = Object.keys(state);
      
      // If there's another user, the one with the "smaller" ID becomes the host
      if (users.length >= 2) {
        const sortedUsers = users.sort();
        const myIndex = sortedUsers.indexOf(userId);
        const opponentId = sortedUsers[myIndex === 0 ? 1 : 0];
        const isHost = myIndex === 0;
        const roomId = `game_${gameId}_${sortedUsers[0]}_${sortedUsers[1]}`;
        
        console.log(`[Netplay] Match found! Room: ${roomId}, Opponent: ${opponentId}, Host: ${isHost}`);
        
        // Stop matchmaking and connect to the game room
        if (supabase) {
          supabase.removeChannel(matchmakingChannel);
        }
        this.matchmakingChannel = null;
        onMatch(roomId, opponentId, isHost);
        this.connect(roomId, userId, isHost);
      }
    });

    matchmakingChannel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await matchmakingChannel.track({ user_id: userId, joined_at: new Date().toISOString() });
      }
    });

    this.matchmakingChannel = matchmakingChannel;
  }

  public leaveMatchmaking() {
    if (this.matchmakingChannel && supabase) {
      supabase.removeChannel(this.matchmakingChannel);
      this.matchmakingChannel = null;
      this.setStatus('disconnected');
    }
  }

  // --- CHAT ---
  public sendChatMessage(room: string, message: { user: string, text: string }) {
    if (this.channel) {
      this.channel.send({
        type: 'broadcast',
        event: 'chat-message',
        payload: { room, ...message }
      });
    }
  }

  public onChatMessage(callback: (message: { user: string, text: string }) => void) {
    if (this.channel) {
      this.channel.on('broadcast', { event: 'chat-message' }, ({ payload }: any) => {
        callback(payload);
      });
    }
  }

  // --- CLEANUP ---
  public disconnect() {
    this.stopPingInterval();
    if (this.channel && supabase) {
      supabase.removeChannel(this.channel);
      this.channel = null;
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
