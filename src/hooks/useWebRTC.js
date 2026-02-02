import { useState, useRef, useCallback, useEffect } from 'react';
import { createConnection } from '../lib/WebRTCConnection';

/**
 * React hook for managing a WebRTC P2P connection.
 *
 * @param {'host'|'companion'} role
 * @param {function} onMessage - called with each incoming data channel message
 */
export default function useWebRTC(role, onMessage) {
  const [state, setState] = useState('idle'); // idle | creating | waiting | connected | failed
  const [offer, setOffer] = useState(null); // encoded offer string (host)
  const [answer, setAnswer] = useState(null); // encoded answer string (companion)
  const connRef = useRef(null);

  // Tear down on unmount
  useEffect(() => {
    return () => connRef.current?.close();
  }, []);

  const handleStateChange = useCallback((connState) => {
    if (connState === 'connected') setState('connected');
    if (connState === 'failed' || connState === 'disconnected') setState('failed');
  }, []);

  const handleChannelOpen = useCallback(() => {
    setState('connected');
  }, []);

  const handleChannelClose = useCallback(() => {
    setState('idle');
  }, []);

  /**
   * HOST: Start hosting — creates offer and returns it.
   */
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
    setState('waiting'); // waiting for companion's answer
    return encodedOffer;
  }, [onMessage, handleStateChange, handleChannelOpen, handleChannelClose]);

  /**
   * HOST: Accept the companion's answer.
   */
  const acceptAnswer = useCallback(async (encodedAnswer) => {
    if (!connRef.current) return;
    await connRef.current.acceptAnswer(encodedAnswer);
  }, []);

  /**
   * COMPANION: Accept the host's offer and produce an answer.
   */
  const acceptOffer = useCallback(async (encodedOffer) => {
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
    setState('waiting'); // waiting for host to accept our answer
    return encodedAnswer;
  }, [onMessage, handleStateChange, handleChannelOpen, handleChannelClose]);

  /**
   * Send data over the data channel.
   */
  const send = useCallback((data) => {
    connRef.current?.send(data);
  }, []);

  /**
   * Disconnect and reset.
   */
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
