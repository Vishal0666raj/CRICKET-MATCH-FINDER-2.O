const User = require('../models/User');
const Match = require('../models/Match');
const Report = require('../models/Report');
const Participant = require('../models/Participant');

// @desc    Get Admin Dashboard Statistics
// @route   GET /api/admin/dashboard
// @access  Private/Admin
const getDashboardTelemetry = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const bannedUsers = await User.countDocuments({ status: 'banned' });
    const totalMatches = await Match.countDocuments();
    const completedMatches = await Match.countDocuments({ status: 'completed' });
    const scheduledMatches = await Match.countDocuments({ status: 'scheduled' });
    const totalReports = await Report.countDocuments();
    const pendingReports = await Report.countDocuments({ status: 'pending' });

    res.status(200).json({
      users: { total: totalUsers, banned: bannedUsers, active: totalUsers - bannedUsers },
      matches: { total: totalMatches, completed: completedMatches, scheduled: scheduledMatches },
      reports: { total: totalReports, pending: pendingReports }
    });
  } catch (error) {
    console.error(`Dashboard stats error: ${error.message}`);
    res.status(500).json({ message: 'Server error generating dashboard data.' });
  }
};

// @desc    Get All Users (Admin)
// @route   GET /api/admin/users
// @access  Private/Admin
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-refreshToken').sort({ createdAt: -1 });
    res.status(200).json(users);
  } catch (error) {
    console.error(`Admin get users error: ${error.message}`);
    res.status(500).json({ message: 'Server error retrieving users.' });
  }
};

// @desc    Ban a User
// @route   PUT /api/admin/users/:id/ban
// @access  Private/Admin
const banUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(400).json({ message: 'Cannot ban an admin user' });
    }

    user.status = 'banned';
    // Revoke login session
    user.refreshToken = undefined;
    await user.save();

    res.status(200).json({ message: `User ${user.name} has been banned.`, user });
  } catch (error) {
    console.error(`Ban user error: ${error.message}`);
    res.status(500).json({ message: 'Server error banning user.' });
  }
};

// @desc    Unban a User
// @route   PUT /api/admin/users/:id/unban
// @access  Private/Admin
const unbanUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.status = 'active';
    await user.save();

    res.status(200).json({ message: `User ${user.name} has been unbanned.`, user });
  } catch (error) {
    console.error(`Unban user error: ${error.message}`);
    res.status(500).json({ message: 'Server error unbanning user.' });
  }
};

// @desc    Get All Matches (Admin)
// @route   GET /api/admin/matches
// @access  Private/Admin
const getAllMatches = async (req, res) => {
  try {
    const matches = await Match.find().populate('creator', 'name username email').sort({ createdAt: -1 });
    res.status(200).json(matches);
  } catch (error) {
    console.error(`Admin get matches error: ${error.message}`);
    res.status(500).json({ message: 'Server error retrieving matches.' });
  }
};

// @desc    Delete a Match (Admin Moderation)
// @route   DELETE /api/admin/matches/:id
// @access  Private/Admin
const deleteMatch = async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    // Delete participants
    await Participant.deleteMany({ matchId: match._id });
    // Delete match
    await Match.deleteOne({ _id: match._id });

    res.status(200).json({ message: 'Match deleted successfully' });
  } catch (error) {
    console.error(`Admin delete match error: ${error.message}`);
    res.status(500).json({ message: 'Server error deleting match.' });
  }
};

// @desc    Get All Reports
// @route   GET /api/admin/reports
// @access  Private/Admin
const getAllReports = async (req, res) => {
  try {
    const reports = await Report.find()
      .populate('reporter', 'name username')
      .populate('targetUser', 'name username status')
      .populate('targetMatch', 'title status')
      .sort({ createdAt: -1 });

    res.status(200).json(reports);
  } catch (error) {
    console.error(`Admin get reports error: ${error.message}`);
    res.status(500).json({ message: 'Server error retrieving reports.' });
  }
};

// @desc    Resolve a Report
// @route   PUT /api/admin/reports/:id/resolve
// @access  Private/Admin
const resolveReport = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    report.status = 'resolved';
    await report.save();

    res.status(200).json({ message: 'Report marked as resolved', report });
  } catch (error) {
    console.error(`Admin resolve report error: ${error.message}`);
    res.status(500).json({ message: 'Server error resolving report.' });
  }
};

module.exports = {
  getDashboardTelemetry,
  getAllUsers,
  banUser,
  unbanUser,
  getAllMatches,
  deleteMatch,
  getAllReports,
  resolveReport
};
