import { useState, useRef, useCallback, useEffect } from 'react';
import { createConnection, type ConnectionManager } from '../lib/WebRTCConnection';

const MAX_CONTROLLERS = 4;

export interface ControllerState {
  state: 'waiting' | 'connected';
  offer?: string;
}

export default function useMultiWebRTC(onMessage: (controllerId: number, msg: unknown) => void) {
  const [controllers, setControllers] = useState<Record<number, ControllerState>>({});
  const connectionsRef = useRef<Record<number, ConnectionManager>>({});
  const availableIdsRef = useRef([0, 1, 2, 3]);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    return () => {
      Object.values(connectionsRef.current).forEach((c) => c.close());
    };
  }, []);

  const releaseId = useCallback((id: number) => {
    availableIdsRef.current.push(id);
    availableIdsRef.current.sort();
    delete connectionsRef.current[id];
    setControllers((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const startHosting = useCallback(async (): Promise<{ offer: string; controllerId: number } | null> => {
    if (availableIdsRef.current.length === 0) return null;
    const id = availableIdsRef.current.shift()!;

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

  const acceptAnswer = useCallback(async (controllerId: number, encodedAnswer: string) => {
    const conn = connectionsRef.current[controllerId];
    if (!conn) return;
    await conn.acceptAnswer(encodedAnswer);
  }, []);

  const disconnectOne = useCallback((controllerId: number) => {
    connectionsRef.current[controllerId]?.close();
    releaseId(controllerId);
  }, [releaseId]);

  const disconnectAll = useCallback(() => {
    Object.keys(connectionsRef.current).forEach((id) => {
      connectionsRef.current[Number(id)]?.close();
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
