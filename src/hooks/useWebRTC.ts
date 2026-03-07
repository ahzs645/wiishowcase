import { useState, useRef, useCallback, useEffect } from 'react';
import { createConnection, type ConnectionManager } from '../lib/WebRTCConnection';

export type WebRTCState = 'idle' | 'creating' | 'waiting' | 'connected' | 'failed';

export default function useWebRTC(role: 'host' | 'companion', onMessage: (msg: unknown) => void) {
  const [state, setState] = useState<WebRTCState>('idle');
  const [offer, setOffer] = useState<string | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const connRef = useRef<ConnectionManager | null>(null);

  useEffect(() => {
    return () => connRef.current?.close();
  }, []);

  const handleStateChange = useCallback((connState: string) => {
    if (connState === 'connected') setState('connected');
    if (connState === 'failed' || connState === 'disconnected') setState('failed');
  }, []);

  const handleChannelOpen = useCallback(() => {
    setState('connected');
  }, []);

  const handleChannelClose = useCallback(() => {
    setState('idle');
  }, []);

  const startHosting = useCallback(async () => {
    connRef.current?.close();
    setState('creating');

    const conn = createConnection({
      role: 'host',
      onStateChange: handleStateChange,
      onMessage,
      onChannelOpen: handleChannelOpen,
      onChannelClose: handleChannelClose,
    });
    connRef.current = conn;

    const encodedOffer = await conn.createOffer();
    setOffer(encodedOffer);
    setState('waiting');
    return encodedOffer;
  }, [onMessage, handleStateChange, handleChannelOpen, handleChannelClose]);

  const acceptAnswer = useCallback(async (encodedAnswer: string) => {
    if (!connRef.current) return;
    await connRef.current.acceptAnswer(encodedAnswer);
  }, []);

  const acceptOffer = useCallback(async (encodedOffer: string) => {
    connRef.current?.close();
    setState('creating');

    const conn = createConnection({
      role: 'companion',
      onStateChange: handleStateChange,
      onMessage,
      onChannelOpen: handleChannelOpen,
      onChannelClose: handleChannelClose,
    });
    connRef.current = conn;

    const encodedAnswer = await conn.acceptOffer(encodedOffer);
    setAnswer(encodedAnswer);
    setState('waiting');
    return encodedAnswer;
  }, [onMessage, handleStateChange, handleChannelOpen, handleChannelClose]);

  const send = useCallback((data: unknown) => {
    connRef.current?.send(data);
  }, []);

  const disconnect = useCallback(() => {
    connRef.current?.close();
    connRef.current = null;
    setState('idle');
    setOffer(null);
    setAnswer(null);
  }, []);

  return {
    state,
    offer,
    answer,
    startHosting,
    acceptAnswer,
    acceptOffer,
    send,
    disconnect,
  };
}
