import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

export function useSocket(onEvent) {
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = io(import.meta.env.VITE_SOCKET_URL, {
      withCredentials: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket connected');
    });

    socket.on('connect_error', (err) => {
      console.log('Socket error:', err.message);
    });

    if (onEvent) {
      onEvent(socket);
    }

    return () => {
      socket.disconnect();
    };
  }, []);

  return socketRef;
}