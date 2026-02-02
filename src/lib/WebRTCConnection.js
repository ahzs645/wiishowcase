/**
 * WebRTC P2P Connection Manager
 *
 * Handles peer connection lifecycle, data channel creation, and
 * SDP offer/answer encoding for serverless signaling (via QR code).
 *
 * Flow:
 *   Host: createOffer() → getEncodedOffer() → [QR code] → acceptAnswer(encoded)
 *   Companion: acceptOffer(encoded) → getEncodedAnswer() → [display code]
 */

const RTC_CONFIG = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

const CHANNEL_LABEL = 'wii-control';

/**
 * Encode SDP + candidates into a URL-safe base64 string.
 */
export function encodeSDP(description) {
  const json = JSON.stringify({
    type: description.type,
    sdp: description.sdp,
  });
  // Use base64 and make it URL-safe
  return btoa(unescape(encodeURIComponent(json)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Decode a URL-safe base64 string back into an RTCSessionDescription.
 */
export function decodeSDP(encoded) {
  // Restore standard base64
  let b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  const json = decodeURIComponent(escape(atob(b64)));
  const { type, sdp } = JSON.parse(json);
  return new RTCSessionDescription({ type, sdp });
}

/**
 * Create a WebRTC connection manager.
 *
 * @param {object} opts
 * @param {'host'|'companion'} opts.role
 * @param {function} opts.onStateChange - called with connection state string
 * @param {function} opts.onMessage - called with parsed message from data channel
 * @param {function} opts.onChannelOpen - called when data channel opens
 * @param {function} opts.onChannelClose - called when data channel closes
 */
export function createConnection(opts = {}) {
  const {
    role = 'host',
    onStateChange,
    onMessage,
    onChannelOpen,
    onChannelClose,
  } = opts;

  const pc = new RTCPeerConnection(RTC_CONFIG);
  let dataChannel = null;
  let gatheringPromiseResolve = null;

  // Promise that resolves when ICE gathering is complete
  const gatheringComplete = new Promise((resolve) => {
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

  // For companion: host creates the data channel, companion receives it
  pc.ondatachannel = (event) => {
    dataChannel = event.channel;
    setupChannel(dataChannel);
  };

  function setupChannel(ch) {
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

    /**
     * HOST: Create an offer and wait for ICE gathering.
     * Returns the encoded offer string.
     */
    async createOffer() {
      // Host creates the data channel
      dataChannel = pc.createDataChannel(CHANNEL_LABEL, { ordered: true });
      setupChannel(dataChannel);

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Wait for ICE candidates to be gathered
      await gatheringComplete;

      return encodeSDP(pc.localDescription);
    },

    /**
     * HOST: Accept the companion's encoded answer.
     */
    async acceptAnswer(encodedAnswer) {
      const answer = decodeSDP(encodedAnswer);
      await pc.setRemoteDescription(answer);
    },

    /**
     * COMPANION: Accept the host's encoded offer.
     * Returns the encoded answer string.
     */
    async acceptOffer(encodedOffer) {
      const offer = decodeSDP(encodedOffer);
      await pc.setRemoteDescription(offer);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Wait for ICE candidates to be gathered
      await gatheringComplete;

      return encodeSDP(pc.localDescription);
    },

    /**
     * Send a message over the data channel.
     */
    send(data) {
      if (dataChannel?.readyState === 'open') {
        dataChannel.send(typeof data === 'string' ? data : JSON.stringify(data));
      }
    },

    /**
     * Get the current data channel state.
     */
    getChannelState() {
      return dataChannel?.readyState ?? 'closed';
    },

    /**
     * Clean up the connection.
     */
    close() {
      dataChannel?.close();
      pc.close();
    },
  };
}
