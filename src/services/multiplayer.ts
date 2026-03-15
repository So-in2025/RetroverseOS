import { io, Socket } from 'socket.io-client';

type SignalPayload = {
  target: string;
  caller?: string;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidate;
};

export class MultiplayerService {
  private socket: Socket | null = null;
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private roomId: string | null = null;
  private userId: string | null = null;

  // ICE Servers (STUN/TURN)
  private rtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:global.stun.twilio.com:3478' }
    ]
  };

  constructor() {}

  // Matchmaking
  public joinMatchmaking(gameId: string, userId: string, onMatchFound: (roomId: string, opponentId: string, isHost: boolean) => void, onStatus: (status: string) => void) {
    if (!this.socket) {
      this.socket = io();
    }
    
    this.userId = userId;

    this.socket.on('matchmaking-status', (data) => {
      onStatus(data.status);
    });

    this.socket.on('match-found', (data) => {
      this.roomId = data.roomId;
      onMatchFound(data.roomId, data.opponentId, data.isHost);
      // Automatically join the room
      this.socket?.emit('join-room', data.roomId, userId);
    });

    this.socket.emit('join-matchmaking', { gameId, userId });
  }

  public leaveMatchmaking() {
    if (this.socket) {
      this.socket.emit('leave-matchmaking');
      this.socket.off('matchmaking-status');
      this.socket.off('match-found');
    }
  }

  connect(roomId: string, userId: string) {
    this.roomId = roomId;
    this.userId = userId;
    this.socket = io();

    this.socket.on('connect', () => {
      console.log('[Multiplayer] Connected to signaling server');
      this.socket?.emit('join-room', roomId, userId);
    });

    this.socket.on('user-connected', (remoteUserId: string) => {
      console.log('[Multiplayer] User connected:', remoteUserId);
      this.initiatePeerConnection(remoteUserId);
    });

    this.socket.on('offer', async (payload: SignalPayload) => {
      console.log('[Multiplayer] Received offer');
      await this.handleOffer(payload);
    });

    this.socket.on('answer', async (payload: SignalPayload) => {
      console.log('[Multiplayer] Received answer');
      await this.handleAnswer(payload);
    });

    this.socket.on('ice-candidate', async (payload: SignalPayload) => {
      console.log('[Multiplayer] Received ICE candidate');
      await this.handleIceCandidate(payload);
    });
  }

  private async initiatePeerConnection(targetUserId: string) {
    this.peerConnection = new RTCPeerConnection(this.rtcConfig);

    // Create Data Channel
    this.dataChannel = this.peerConnection.createDataChannel("game-inputs");
    this.setupDataChannel(this.dataChannel);

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket?.emit('ice-candidate', {
          target: targetUserId,
          candidate: event.candidate
        });
      }
    };

    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);

    this.socket?.emit('offer', {
      target: targetUserId,
      caller: this.userId,
      sdp: offer
    });
  }

  private async handleOffer(payload: SignalPayload) {
    this.peerConnection = new RTCPeerConnection(this.rtcConfig);

    this.peerConnection.ondatachannel = (event) => {
      this.setupDataChannel(event.channel);
    };

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket?.emit('ice-candidate', {
          target: payload.caller!,
          candidate: event.candidate
        });
      }
    };

    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(payload.sdp!));
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);

    this.socket?.emit('answer', {
      target: payload.caller!,
      sdp: answer
    });
  }

  private async handleAnswer(payload: SignalPayload) {
    await this.peerConnection?.setRemoteDescription(new RTCSessionDescription(payload.sdp!));
  }

  private async handleIceCandidate(payload: SignalPayload) {
    try {
      await this.peerConnection?.addIceCandidate(new RTCIceCandidate(payload.candidate!));
    } catch (e) {
      console.error('Error adding received ice candidate', e);
    }
  }

  private onInputCallback: ((input: any) => void) | null = null;

  onInput(callback: (input: any) => void) {
    this.onInputCallback = callback;
  }

  // Chat Functionality
  sendChatMessage(room: string, message: { user: string, text: string }) {
    this.socket?.emit('chat-message', { room, ...message });
  }

  onChatMessage(callback: (message: { user: string, text: string }) => void) {
    this.socket?.on('chat-message', callback);
  }

  private setupDataChannel(channel: RTCDataChannel) {
    this.dataChannel = channel;
    channel.onopen = () => console.log('[Multiplayer] Data channel open');
    channel.onmessage = (event) => {
      // Handle incoming game state/inputs
      const data = JSON.parse(event.data);
      if (this.onInputCallback) {
        this.onInputCallback(data);
      }
    };
  }

  sendInput(input: any) {
    if (this.dataChannel?.readyState === 'open') {
      this.dataChannel.send(JSON.stringify(input));
    }
  }
  disconnect() {
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
    console.log('[Multiplayer] Disconnected');
  }
}

export const multiplayer = new MultiplayerService();
