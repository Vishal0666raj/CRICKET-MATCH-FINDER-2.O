const Match = require('../models/Match');
const Participant = require('../models/Participant');
const User = require('../models/User');
const Chat = require('../models/Chat');
const { sendNotification } = require('../services/notificationService');

// @desc    Create a Match
// @route   POST /api/matches
// @access  Private
const createMatch = async (req, res) => {
  const {
    title,
    description,
    ground,
    address,
    longitude,
    latitude,
    date,
    time,
    overs,
    playersNeeded,
    skillLevel,
    ballType,
    entryFee,
    isPrivate,
    maxPlayers,
    notes
  } = req.body;

  if (!title || !ground || !address || !longitude || !latitude || !date || !time || !overs || !playersNeeded || !ballType || !maxPlayers) {
    return res.status(400).json({ message: 'Please provide all required fields' });
  }

  try {
    const lng = parseFloat(longitude);
    const lat = parseFloat(latitude);

    if (isNaN(lng) || isNaN(lat)) {
      return res.status(400).json({ message: 'Invalid coordinates' });
    }

    const match = await Match.create({
      title,
      description,
      ground,
      address,
      location: {
        type: 'Point',
        coordinates: [lng, lat]
      },
      date: new Date(date),
      time,
      overs: parseInt(overs),
      playersNeeded: parseInt(playersNeeded),
      skillLevel,
      ballType,
      entryFee: parseFloat(entryFee) || 0,
      isPrivate: isPrivate === true || isPrivate === 'true',
      maxPlayers: parseInt(maxPlayers),
      notes,
      creator: req.user._id,
      status: 'scheduled'
    });

    // Auto-join creator as an accepted participant
    await Participant.create({
      matchId: match._id,
      userId: req.user._id,
      status: 'accepted',
      attendance: 'pending' // pending until game day / verification
    });

    res.status(201).json(match);
  } catch (error) {
    console.error(`Create match error: ${error.message}`);
    res.status(500).json({ message: 'Server error creating match.' });
  }
};

// @desc    Get All Matches with Filters & Geospatial Search
// @route   GET /api/matches
// @access  Private
const getMatches = async (req, res) => {
  const {
    query,
    ground,
    city,
    skill,
    ballType,
    longitude,
    latitude,
    distance, // in kilometers
    date
  } = req.query;

  try {
    let mongoQuery = {};

    // Text Search (title / description)
    if (query) {
      mongoQuery.$or = [
        { title: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ];
    }

    if (ground) {
      mongoQuery.ground = { $regex: ground, $options: 'i' };
    }

    if (city) {
      mongoQuery.address = { $regex: city, $options: 'i' };
    }

    if (skill && skill !== 'All') {
      mongoQuery.skillLevel = skill;
    }

    if (ballType && ballType !== 'All') {
      mongoQuery.ballType = ballType;
    }

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      mongoQuery.date = { $gte: startOfDay, $lte: endOfDay };
    }

    // Only search scheduled matches unless requested otherwise
    mongoQuery.status = 'scheduled';

    // Geospatial filter
    if (longitude && latitude) {
      const lng = parseFloat(longitude);
      const lat = parseFloat(latitude);
      const radKm = parseFloat(distance) || 15; // default 15km radius

      if (!isNaN(lng) && !isNaN(lat)) {
        // Mongoose $nearSphere with coordinates and max distance in meters
        mongoQuery.location = {
          $nearSphere: {
            $geometry: {
              type: 'Point',
              coordinates: [lng, lat]
            },
            $maxDistance: radKm * 1000
          }
        };
      }
    }

    const matches = await Match.find(mongoQuery)
      .populate('creator', 'name username profilePicture')
      .limit(50);

    // Fetch accepted participants count for each match
    const matchesWithParticipants = await Promise.all(
      matches.map(async (match) => {
        const acceptedCount = await Participant.countDocuments({
          matchId: match._id,
          status: 'accepted'
        });
        const hasJoined = await Participant.exists({
          matchId: match._id,
          userId: req.user._id
        });
        return {
          ...match.toObject(),
          acceptedPlayersCount: acceptedCount,
          hasJoined: !!hasJoined
        };
      })
    );

    res.status(200).json(matchesWithParticipants);
  } catch (error) {
    console.error(`Get matches error: ${error.message}`);
    res.status(500).json({ message: 'Server error retrieving matches.' });
  }
};

// @desc    Get Match by ID
// @route   GET /api/matches/:id
// @access  Private
const getMatchById = async (req, res) => {
  try {
    const match = await Match.findById(req.params.id)
      .populate('creator', 'name username profilePicture')
      .populate('result.mvp', 'name username profilePicture');

    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    // Fetch all participants
    const participants = await Participant.find({ matchId: match._id })
      .populate('userId', 'name username profilePicture statistics email preferredPosition skillLevel');

    const acceptedCount = participants.filter(p => p.status === 'accepted').length;
    const userParticipant = participants.find(p => p.userId._id.toString() === req.user._id.toString());

    res.status(200).json({
      match,
      participants,
      acceptedPlayersCount: acceptedCount,
      userStatus: userParticipant ? userParticipant.status : 'none',
      userAttendance: userParticipant ? userParticipant.attendance : 'none'
    });
  } catch (error) {
    console.error(`Get match error: ${error.message}`);
    res.status(500).json({ message: 'Server error retrieving match details.' });
  }
};

// @desc    Request to Join a Match
// @route   POST /api/matches/:id/join
// @access  Private
const joinMatch = async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    if (match.status !== 'scheduled') {
      return res.status(400).json({ message: 'Cannot join an inactive match' });
    }

    // Check if already participant
    const existing = await Participant.findOne({ matchId: match._id, userId: req.user._id });
    if (existing) {
      return res.status(400).json({ message: 'You have already requested or joined this match' });
    }

    // Check if match is full
    const acceptedCount = await Participant.countDocuments({ matchId: match._id, status: 'accepted' });
    if (acceptedCount >= match.maxPlayers) {
      return res.status(400).json({ message: 'Match is already full' });
    }

    // Create request
    const participant = await Participant.create({
      matchId: match._id,
      userId: req.user._id,
      status: 'requested'
    });

    // Send Real-time Notification to match organizer
    const io = req.app.get('io');
    await sendNotification({
      recipient: match.creator,
      sender: req.user._id,
      type: 'invite',
      matchId: match._id,
      message: `${req.user.name} has requested to join your match "${match.title}"`,
      io
    });

    res.status(200).json({ message: 'Request sent successfully', participant });
  } catch (error) {
    console.error(`Join match error: ${error.message}`);
    res.status(500).json({ message: 'Server error request to join match.' });
  }
};

// @desc    Leave a Match / Cancel request
// @route   POST /api/matches/:id/leave
// @access  Private
const leaveMatch = async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    if (match.creator.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Organizer cannot leave the match. Cancel the match instead.' });
    }

    const participant = await Participant.findOne({ matchId: match._id, userId: req.user._id });
    if (!participant) {
      return res.status(400).json({ message: 'You are not a participant in this match' });
    }

    const wasAccepted = participant.status === 'accepted';
    await Participant.deleteOne({ _id: participant._id });

    // If they were an accepted player, notify organizer
    if (wasAccepted) {
      const io = req.app.get('io');
      await sendNotification({
        recipient: match.creator,
        sender: req.user._id,
        type: 'player_left',
        matchId: match._id,
        message: `${req.user.name} has left your match "${match.title}"`,
        io
      });

      // Post notification to Chat room
      await Chat.create({
        matchId: match._id,
        sender: req.user._id,
        message: `${req.user.name} has left the match`,
        type: 'notification'
      });

      if (io) {
        io.to(`match_${match._id}`).emit('chat_notification', {
          matchId: match._id,
          message: `${req.user.name} has left the match`
        });
      }
    }

    res.status(200).json({ message: 'Left match successfully' });
  } catch (error) {
    console.error(`Leave match error: ${error.message}`);
    res.status(500).json({ message: 'Server error leaving match.' });
  }
};

// @desc    Accept or Reject participant (Organizer Only)
// @route   PUT /api/matches/:id/participants
// @access  Private
const manageParticipant = async (req, res) => {
  const { participantId, status } = req.body; // status: 'accepted' or 'rejected'

  if (!participantId || !['accepted', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'Invalid parameters' });
  }

  try {
    const match = await Match.findById(req.params.id);
    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    if (match.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized. Only the organizer can manage players.' });
    }

    const participant = await Participant.findById(participantId).populate('userId', 'name');
    if (!participant || participant.matchId.toString() !== match._id.toString()) {
      return res.status(404).json({ message: 'Participant record not found' });
    }

    if (status === 'accepted') {
      // Check limits
      const acceptedCount = await Participant.countDocuments({ matchId: match._id, status: 'accepted' });
      if (acceptedCount >= match.maxPlayers) {
        return res.status(400).json({ message: 'Match is full. Cannot accept more players.' });
      }
    }

    participant.status = status;
    await participant.save();

    const io = req.app.get('io');

    // Notify player
    await sendNotification({
      recipient: participant.userId._id,
      sender: req.user._id,
      type: status === 'accepted' ? 'match_accepted' : 'match_cancelled',
      matchId: match._id,
      message: status === 'accepted' 
        ? `Congratulations! You have been accepted to join "${match.title}"`
        : `Sorry, your request to join "${match.title}" was declined`,
      io
    });

    if (status === 'accepted') {
      // Send chat notification
      await Chat.create({
        matchId: match._id,
        sender: participant.userId._id,
        message: `${participant.userId.name} joined the match`,
        type: 'notification'
      });

      if (io) {
        io.to(`match_${match._id}`).emit('chat_notification', {
          matchId: match._id,
          message: `${participant.userId.name} joined the match`
        });
      }
    }

    res.status(200).json({ message: `Participant has been ${status}`, participant });
  } catch (error) {
    console.error(`Manage participant error: ${error.message}`);
    res.status(500).json({ message: 'Server error managing participant.' });
  }
};

// @desc    Self-Confirm Attendance or Organizer verify Attendance
// @route   PUT /api/matches/:id/attendance
// @access  Private
const updateAttendance = async (req, res) => {
  const { userId, attendance } = req.body; // attendance: 'present' or 'absent'

  if (!['present', 'absent'].includes(attendance)) {
    return res.status(400).json({ message: 'Invalid attendance state' });
  }

  try {
    const match = await Match.findById(req.params.id);
    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    const targetUserId = userId || req.user._id;
    const isOrganizer = match.creator.toString() === req.user._id.toString();

    // Check if player is accepted
    const participant = await Participant.findOne({ matchId: match._id, userId: targetUserId });
    if (!participant || participant.status !== 'accepted') {
      return res.status(400).json({ message: 'User is not an accepted player in this match' });
    }

    // If user is self-confirming, they can only confirm 'present' and cannot override organizer decisions
    if (!isOrganizer && targetUserId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized to change this user\'s attendance' });
    }

    participant.attendance = attendance;
    await participant.save();

    // Re-calculate attendance percentage for the user
    // Finds all participant records for this user where the match is 'completed'
    const userParticipants = await Participant.find({ userId: targetUserId }).populate('matchId');
    const completedMatches = userParticipants.filter(p => p.matchId && p.matchId.status === 'completed');

    let present = 0;
    let absent = 0;

    completedMatches.forEach(p => {
      if (p.attendance === 'present') present++;
      if (p.attendance === 'absent') absent++;
    });

    const user = await User.findById(targetUserId);
    if (user) {
      user.statistics.presentCount = present;
      user.statistics.absentCount = absent;
      const totalCount = present + absent;
      user.statistics.attendancePercentage = totalCount > 0 ? Math.round((present / totalCount) * 100) : 100;
      await user.save();
    }

    res.status(200).json({ message: 'Attendance updated successfully', participant });
  } catch (error) {
    console.error(`Update attendance error: ${error.message}`);
    res.status(500).json({ message: 'Server error updating attendance.' });
  }
};

// @desc    Complete Match & Upload results/player statistics
// @route   POST /api/matches/:id/complete
// @access  Private
const completeMatch = async (req, res) => {
  const {
    winningTeam,
    scores,
    runs,
    wickets,
    mvp,
    playerPerformances // Array of: { userId, runs, wickets, ballsFaced, won (boolean) }
  } = req.body;

  try {
    const match = await Match.findById(req.params.id);
    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    if (match.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the organizer can complete the match' });
    }

    if (match.status === 'completed') {
      return res.status(400).json({ message: 'Match is already completed' });
    }

    // Update match info
    match.status = 'completed';
    match.result = {
      winningTeam,
      scores,
      runs: parseInt(runs) || 0,
      wickets: parseInt(wickets) || 0,
      mvp: mvp || null
    };
    await match.save();

    // Mark all pending participants as present (default logic)
    await Participant.updateMany(
      { matchId: match._id, status: 'accepted', attendance: 'pending' },
      { attendance: 'present' }
    );

    // Update Player Stats
    if (playerPerformances && Array.isArray(playerPerformances)) {
      for (const perf of playerPerformances) {
        const player = await User.findById(perf.userId);
        if (player) {
          player.statistics.matchesPlayed += 1;
          if (perf.won) {
            player.statistics.wins += 1;
          }
          
          const perfRuns = parseInt(perf.runs) || 0;
          const perfWickets = parseInt(perf.wickets) || 0;
          const perfBalls = parseInt(perf.ballsFaced) || 0;

          player.statistics.runs += perfRuns;
          player.statistics.wickets += perfWickets;

          // Re-calculate batting average: totalRuns / matchesPlayed
          player.statistics.average = player.statistics.matchesPlayed > 0 
            ? parseFloat((player.statistics.runs / player.statistics.matchesPlayed).toFixed(2)) 
            : 0;

          // Re-calculate strike rate: (totalRuns / totalBalls) * 100
          // If we track balls faced, add them, otherwise mock a realistic count or use an estimated value
          if (perfBalls > 0) {
            // Let's add balls faced to statistics schema or store total balls faced
            // For simple calculations, let's update strikeRate per match average
            const currentSR = player.statistics.strikeRate;
            const newSR = (perfRuns / perfBalls) * 100;
            player.statistics.strikeRate = currentSR > 0 
              ? parseFloat(((currentSR + newSR) / 2).toFixed(2)) 
              : parseFloat(newSR.toFixed(2));
          }

          // Re-calculate attendance percentage after marking pending as present
          const userParticipants = await Participant.find({ userId: perf.userId }).populate('matchId');
          const completedMatches = userParticipants.filter(p => p.matchId && p.matchId.status === 'completed');
          let present = 0;
          let absent = 0;
          completedMatches.forEach(p => {
            if (p.attendance === 'present') present++;
            if (p.attendance === 'absent') absent++;
          });

          player.statistics.presentCount = present;
          player.statistics.absentCount = absent;
          const totalCount = present + absent;
          player.statistics.attendancePercentage = totalCount > 0 
            ? Math.round((present / totalCount) * 100) 
            : 100;

          await player.save();
        }
      }
    }

    // Notify all accepted participants that the match is completed and scores are available
    const participants = await Participant.find({ matchId: match._id, status: 'accepted' });
    const io = req.app.get('io');
    
    for (const p of participants) {
      if (p.userId.toString() !== req.user._id.toString()) {
        await sendNotification({
          recipient: p.userId,
          sender: req.user._id,
          type: 'reminder',
          matchId: match._id,
          message: `Match results for "${match.title}" are out! Check scores and rate your teammates.`,
          io
        });
      }
    }

    res.status(200).json({ message: 'Match completed and statistics updated successfully', match });
  } catch (error) {
    console.error(`Complete match error: ${error.message}`);
    res.status(500).json({ message: 'Server error completing match.' });
  }
};

// @desc    Get nearby organizers who are looking for matches (players can locate games, or organizers find looking players)
// @route   GET /api/matches/nearby-players
// @access  Private
const getNearbyPlayers = async (req, res) => {
  const { longitude, latitude, distance } = req.query;

  if (!longitude || !latitude) {
    return res.status(400).json({ message: 'Coordinates are required to find nearby players.' });
  }

  try {
    const lng = parseFloat(longitude);
    const lat = parseFloat(latitude);
    const radKm = parseFloat(distance) || 10;

    const players = await User.find({
      isLookingForMatch: true,
      _id: { $ne: req.user._id },
      'lookingForMatchConfig.location': {
        $nearSphere: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat]
          },
          $maxDistance: radKm * 1000
        }
      }
    }).select('-refreshToken -email');

    res.status(200).json(players);
  } catch (error) {
    console.error(`Get nearby players error: ${error.message}`);
    res.status(500).json({ message: 'Server error finding nearby players.' });
  }
};

module.exports = {
  createMatch,
  getMatches,
  getMatchById,
  joinMatch,
  leaveMatch,
  manageParticipant,
  updateAttendance,
  completeMatch,
  getNearbyPlayers
};
