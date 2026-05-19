import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

export function useSocket(onEvent) {
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = io(import.meta.env.VITE_SOCKET_URL, {
      withCredentials: true,
    });

    console.log('Connecting to socket at:', import.meta.env.VITE_SOCKET_URL);

    socketRef.current = socket;

    console.log('Socket initialized:', socket);

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