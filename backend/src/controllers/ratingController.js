const Rating = require('../models/Rating');
const User = require('../models/User');
const Participant = require('../models/Participant');
const Match = require('../models/Match');

// @desc    Submit a Rating for a Player
// @route   POST /api/ratings
// @access  Private
const submitRating = async (req, res) => {
  const { matchId, rateeId, sportsmanship, skill, teamwork, punctuality } = req.body;

  if (!matchId || !rateeId || !sportsmanship || !skill || !teamwork || !punctuality) {
    return res.status(400).json({ message: 'All rating scores and IDs are required' });
  }

  const sScore = parseFloat(sportsmanship);
  const skScore = parseFloat(skill);
  const tScore = parseFloat(teamwork);
  const pScore = parseFloat(punctuality);

  if ([sScore, skScore, tScore, pScore].some(s => isNaN(s) || s < 1 || s > 5)) {
    return res.status(400).json({ message: 'Rating scores must be numbers between 1 and 5' });
  }

  try {
    // Check if match exists and is completed
    const match = await Match.findById(matchId);
    if (!match || match.status !== 'completed') {
      return res.status(400).json({ message: 'Ratings can only be submitted for completed matches' });
    }

    // Check if rater and ratee were accepted participants in the match
    const raterParticipant = await Participant.findOne({ matchId, userId: req.user._id, status: 'accepted' });
    const rateeParticipant = await Participant.findOne({ matchId, userId: rateeId, status: 'accepted' });

    if (!raterParticipant || !rateeParticipant) {
      return res.status(400).json({ message: 'Both rater and ratee must have been accepted participants in this match' });
    }

    if (req.user._id.toString() === rateeId.toString()) {
      return res.status(400).json({ message: 'You cannot rate yourself' });
    }

    // Check if rating already exists
    const existing = await Rating.findOne({ matchId, rater: req.user._id, ratee: rateeId });
    if (existing) {
      return res.status(400).json({ message: 'You have already rated this player for this match' });
    }

    // Calculate rating average for this submission
    const averageRating = (sScore + skScore + tScore + pScore) / 4;

    // Create Rating
    const rating = await Rating.create({
      matchId,
      rater: req.user._id,
      ratee: rateeId,
      sportsmanship: sScore,
      skill: skScore,
      teamwork: tScore,
      punctuality: pScore,
      averageRating: parseFloat(averageRating.toFixed(2))
    });

    // Update player (ratee) average rating and ratingsCount
    const user = await User.findById(rateeId);
    if (user) {
      const oldCount = user.statistics.ratingsCount || 0;
      const oldRating = user.statistics.rating || 5.0;

      const newCount = oldCount + 1;
      const newRating = ((oldRating * oldCount) + averageRating) / newCount;

      user.statistics.ratingsCount = newCount;
      user.statistics.rating = parseFloat(newRating.toFixed(2));
      await user.save();
    }

    res.status(201).json({ message: 'Rating submitted successfully', rating });
  } catch (error) {
    console.error(`Submit rating error: ${error.message}`);
    res.status(500).json({ message: 'Server error submitting rating.' });
  }
};

module.exports = { submitRating };
