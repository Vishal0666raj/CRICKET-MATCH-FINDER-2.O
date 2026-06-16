const Notification = require('../models/Notification');

// @desc    Get User Notifications
// @route   GET /api/notifications
// @access  Private
const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .populate('sender', 'name username profilePicture')
      .populate('matchId', 'title date time')
      .sort({ createdAt: -1 })
      .limit(100);

    res.status(200).json(notifications);
  } catch (error) {
    console.error(`Get notifications error: ${error.message}`);
    res.status(500).json({ message: 'Server error retrieving notifications.' });
  }
};

// @desc    Mark a Notification as Read
// @route   PUT /api/notifications/:id/read
// @access  Private
const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    if (notification.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized action' });
    }

    notification.isRead = true;
    await notification.save();

    res.status(200).json(notification);
  } catch (error) {
    console.error(`Mark read error: ${error.message}`);
    res.status(500).json({ message: 'Server error marking notification as read.' });
  }
};

// @desc    Mark All Notifications as Read
// @route   PUT /api/notifications/read-all
// @access  Private
const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { isRead: true }
    );
    res.status(200).json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error(`Mark all read error: ${error.message}`);
    res.status(500).json({ message: 'Server error marking all notifications as read.' });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead
};
