const express = require('express');
const router = express.Router();
const {
  createMatch,
  getMatches,
  getMatchById,
  joinMatch,
  leaveMatch,
  manageParticipant,
  updateAttendance,
  completeMatch,
  getNearbyPlayers
} = require('../controllers/matchController');
const { getChatHistory } = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/', createMatch);
router.get('/', getMatches);
router.get('/nearby-players', getNearbyPlayers);
router.get('/:id', getMatchById);
router.post('/:id/join', joinMatch);
router.post('/:id/leave', leaveMatch);
router.put('/:id/participants', manageParticipant);
router.put('/:id/attendance', updateAttendance);
router.post('/:id/complete', completeMatch);

// Chat history for match
router.get('/:id/chat', getChatHistory);

module.exports = router;
