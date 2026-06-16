const Notification = require('../models/Notification');

const sendNotification = async ({ recipient, sender, type, matchId, message, io }) => {
  try {
    // Save to Database
    const notification = await Notification.create({
      recipient,
      sender,
      type,
      matchId,
      message
    });

    // Populate sender details for the client
    const populated = await notification.populate('sender', 'name username profilePicture');

    // Emit live via socket.io if server instance and recipient room is active
    if (io) {
      const roomName = `user_${recipient.toString()}`;
      io.to(roomName).emit('notification', populated);
      console.log(`Socket notification emitted to room ${roomName}: ${type}`);
    }

    return populated;
  } catch (error) {
    console.error(`Error sending notification: ${error.message}`);
    return null;
  }
};

module.exports = { sendNotification };
