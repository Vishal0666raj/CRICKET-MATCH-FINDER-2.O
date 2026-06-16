import React, { createContext, useContext, useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useQueryClient } from '@tanstack/react-query';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const SOCKET_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5005';
    console.log(`Initializing Socket connection to: ${SOCKET_URL}`);

    const newSocket = io(SOCKET_URL, {
      query: { userId: user._id },
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('Socket.io connected to server successfully');
    });

    // Handle real-time notifications
    newSocket.on('notification', (notification) => {
      console.log('Real-time notification received:', notification);

      // Play audio notification or trigger custom alert
      try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-200.wav');
        audio.volume = 0.3;
        audio.play();
      } catch (e) {
        // Audio play can be blocked by browser autoplay policy, ignore error
      }

      // Invalidate notifications cache to update notification badge
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user, queryClient]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  return useContext(SocketContext);
};
