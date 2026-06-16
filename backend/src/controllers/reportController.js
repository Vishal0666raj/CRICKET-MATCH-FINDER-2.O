const Report = require('../models/Report');

// @desc    Submit a Report
// @route   POST /api/reports
// @access  Private
const submitReport = async (req, res) => {
  const { targetUserId, targetMatchId, reason } = req.body;

  if (!reason) {
    return res.status(400).json({ message: 'Reason is required to submit a report' });
  }

  try {
    const report = await Report.create({
      reporter: req.user._id,
      targetUser: targetUserId || null,
      targetMatch: targetMatchId || null,
      reason,
      status: 'pending'
    });

    res.status(201).json({ message: 'Report submitted successfully. Administrators will review it.', report });
  } catch (error) {
    console.error(`Submit report error: ${error.message}`);
    res.status(500).json({ message: 'Server error submitting report.' });
  }
};

module.exports = { submitReport };
