const express = require('express');
const router = express.Router();
const { getProfile, updateProfile, getUserById, toggleLookingForMatch, uploadAvatar } = require('../controllers/profileController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.use(protect);

router.get('/', getProfile);
router.put('/', updateProfile);
router.put('/looking-for-match', toggleLookingForMatch);
router.get('/users/:id', getUserById);
router.post('/upload-avatar', upload.single('avatar'), uploadAvatar);

module.exports = router;
