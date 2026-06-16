const Chat = require('../models/Chat');
const Participant = require('../models/Participant');
const Match = require('../models/Match');

// @desc    Get Chat History for a Match
// @route   GET /api/matches/:id/chat
// @access  Private
const getChatHistory = async (req, res) => {
  const matchId = req.params.id;

  try {
    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    // Check if user is accepted participant or creator
    const isCreator = match.creator.toString() === req.user._id.toString();
    const isParticipant = await Participant.exists({
      matchId,
      userId: req.user._id,
      status: 'accepted'
    });

    if (!isCreator && !isParticipant) {
      return res.status(403).json({ message: 'Unauthorized. You must join the match to view the chat room.' });
    }

    const chats = await Chat.find({ matchId })
      .populate('sender', 'name username profilePicture')
      .sort({ createdAt: 1 })
      .limit(100);

    res.status(200).json(chats);
  } catch (error) {
    console.error(`Get chat history error: ${error.message}`);
    res.status(500).json({ message: 'Server error retrieving chat history.' });
  }
};

module.exports = { getChatHistory };
