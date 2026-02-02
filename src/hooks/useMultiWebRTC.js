import { useState, useRef, useCallback, useEffect } from 'react';
import { createConnection } from '../lib/WebRTCConnection';

const MAX_CONTROLLERS = 4;

/**
 * React hook for managing multiple WebRTC P2P connections (host side).
 * Supports up to 4 simultaneous companions with pool-based ID assignment.
 *
 * @param {function} onMessage - called with (controllerId, msg) for each incoming message
 */
export default function useMultiWebRTC(onMessage) {
  const [controllers, setControllers] = useState({});
  const connectionsRef = useRef({});
  const availableIdsRef = useRef([0, 1, 2, 3]);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  // Clean up all connections on unmount
  useEffect(() => {
    return () => {
      Object.values(connectionsRef.current).forEach((c) => c.close());
    };
  }, []);

  const releaseId = useCallback((id) => {
    availableIdsRef.current.push(id);
    availableIdsRef.current.sort();
    delete connectionsRef.current[id];
    setControllers((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  /**
   * Start hosting a new controller slot.
   * Returns { offer, controllerId } or null if all slots are full.
   */
  const startHosting = useCallback(async () => {
    if (availableIdsRef.current.length === 0) return null;
    const id = availableIdsRef.current.shift();

    const conn = createConnection({
      role: 'host',
      onStateChange: (s) => {
        if (s === 'connected') {
          setControllers((prev) => ({
            ...prev,
            [id]: { ...prev[id], state: 'connected' },
          }));
        }
        if (s === 'failed' || s === 'disconnected') {
          releaseId(id);
        }
      },
      onMessage: (msg) => onMessageRef.current(id, msg),
      onChannelOpen: () => {
        // Send controller assignment to companion
        conn.send({ type: 'welcome', controllerId: id });
        setControllers((prev) => ({
          ...prev,
          [id]: { ...prev[id], state: 'connected' },
        }));
      },
      onChannelClose: () => {
        releaseId(id);
      },
    });

    connectionsRef.current[id] = conn;

    const offer = await conn.createOffer();
    setControllers((prev) => ({
      ...prev,
      [id]: { state: 'waiting', offer },
    }));

    return { offer, controllerId: id };
  }, [releaseId]);

  /**
   * Accept a companion's answer for a specific controller slot.
   */
  const acceptAnswer = useCallback(async (controllerId, encodedAnswer) => {
    const conn = connectionsRef.current[controllerId];
    if (!conn) return;
    await conn.acceptAnswer(encodedAnswer);
  }, []);

  /**
   * Disconnect a single controller.
   */
  const disconnectOne = useCallback((controllerId) => {
    connectionsRef.current[controllerId]?.close();
    releaseId(controllerId);
  }, [releaseId]);

  /**
   * Disconnect all controllers.
   */
  const disconnectAll = useCallback(() => {
    Object.keys(connectionsRef.current).forEach((id) => {
      connectionsRef.current[id]?.close();
    });
    connectionsRef.current = {};
    availableIdsRef.current = [0, 1, 2, 3];
    setControllers({});
  }, []);

  const connectedCount = Object.values(controllers).filter(
    (c) => c.state === 'connected'
  ).length;

  return {
    controllers,
    startHosting,
    acceptAnswer,
    disconnectOne,
    disconnectAll,
    connectedCount,
    availableSlots: MAX_CONTROLLERS - Object.keys(controllers).length,
  };
}
