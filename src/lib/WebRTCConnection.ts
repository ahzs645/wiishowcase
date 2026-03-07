/**
 * WebRTC P2P Connection Manager
 *
 * Handles peer connection lifecycle, data channel creation, and
 * SDP offer/answer encoding for serverless signaling (via QR code).
 */

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

const CHANNEL_LABEL = 'wii-control';

export function encodeSDP(description: RTCSessionDescription): string {
  const json = JSON.stringify({
    type: description.type,
    sdp: description.sdp,
  });
  return btoa(unescape(encodeURIComponent(json)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function decodeSDP(encoded: string): RTCSessionDescription {
  let b64 = encoded.replace(/\s/g, '').replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  const json = decodeURIComponent(escape(atob(b64)));
  const { type, sdp } = JSON.parse(json);
  return new RTCSessionDescription({ type, sdp });
}

export interface ConnectionOptions {
  role?: 'host' | 'companion';
  onStateChange?: (state: string) => void;
  onMessage?: (msg: unknown) => void;
  onChannelOpen?: () => void;
  onChannelClose?: () => void;
}

export interface ConnectionManager {
  pc: RTCPeerConnection;
  createOffer(): Promise<string>;
  acceptAnswer(encodedAnswer: string): Promise<void>;
  acceptOffer(encodedOffer: string): Promise<string>;
  send(data: unknown): void;
  getChannelState(): string;
  close(): void;
}

export function createConnection(opts: ConnectionOptions = {}): ConnectionManager {
  const {
    onStateChange,
    onMessage,
    onChannelOpen,
    onChannelClose,
  } = opts;

  const pc = new RTCPeerConnection(RTC_CONFIG);
  let dataChannel: RTCDataChannel | null = null;
  let gatheringPromiseResolve: (() => void) | null = null;

  const gatheringComplete = new Promise<void>((resolve) => {
    gatheringPromiseResolve = resolve;
  });

  pc.oniceconnectionstatechange = () => {
    onStateChange?.(pc.iceConnectionState);
  };

  pc.onconnectionstatechange = () => {
    onStateChange?.(pc.connectionState);
  };

  pc.onicegatheringstatechange = () => {
    if (pc.iceGatheringState === 'complete') {
      gatheringPromiseResolve?.();
    }
  };

  pc.ondatachannel = (event) => {
    dataChannel = event.channel;
    setupChannel(dataChannel);
  };

  function setupChannel(ch: RTCDataChannel) {
    ch.onopen = () => onChannelOpen?.();
    ch.onclose = () => onChannelClose?.();
    ch.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        onMessage?.(msg);
      } catch {
        onMessage?.(event.data);
      }
    };
  }

  return {
    pc,

    async createOffer() {
      dataChannel = pc.createDataChannel(CHANNEL_LABEL, { ordered: true });
      setupChannel(dataChannel);

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await gatheringComplete;

      return encodeSDP(pc.localDescription!);
    },

    async acceptAnswer(encodedAnswer: string) {
      const answer = decodeSDP(encodedAnswer);
      await pc.setRemoteDescription(answer);
    },

    async acceptOffer(encodedOffer: string) {
      const offer = decodeSDP(encodedOffer);
      await pc.setRemoteDescription(offer);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await gatheringComplete;

      return encodeSDP(pc.localDescription!);
    },

    send(data: unknown) {
      if (dataChannel?.readyState === 'open') {
        dataChannel.send(typeof data === 'string' ? data : JSON.stringify(data));
      }
    },

    getChannelState() {
      return dataChannel?.readyState ?? 'closed';
    },

    close() {
      dataChannel?.close();
      pc.close();
    },
  };
}
