const socketIo = require('socket.io');
const Chat = require('../models/Chat');
const User = require('../models/User');

const initSocket = (server) => {
  const io = socketIo(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5174',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket client connected: ${socket.id}`);

    // Register user for private notifications
    const userId = socket.handshake.query.userId;
    if (userId) {
      socket.join(`user_${userId}`);
      console.log(`User joined private notification room: user_${userId}`);
    }

    // Join Match Chat Room
    socket.on('join_match_chat', ({ matchId }) => {
      socket.join(`match_${matchId}`);
      console.log(`Socket ${socket.id} joined room match_${matchId}`);
    });

    // Handle incoming chat message
    socket.on('send_message', async ({ matchId, senderId, message }) => {
      try {
        if (!matchId || !senderId || !message) {
          return;
        }

        // Store chat message in database
        const chat = await Chat.create({
          matchId,
          sender: senderId,
          message,
          type: 'message'
        });

        // Populate sender info
        const populatedChat = await chat.populate('sender', 'name username profilePicture');

        // Broadcast message to everyone in the match room
        io.to(`match_${matchId}`).emit('receive_message', populatedChat);
      } catch (error) {
        console.error(`Socket chat message error: ${error.message}`);
      }
    });

    // Handle typing indicator (optional but cool UX)
    socket.on('typing', ({ matchId, username, isTyping }) => {
      socket.to(`match_${matchId}`).emit('player_typing', { username, isTyping });
    });

    socket.on('disconnect', () => {
      console.log(`Socket client disconnected: ${socket.id}`);
    });
  });

  return io;
};

module.exports = { initSocket };
