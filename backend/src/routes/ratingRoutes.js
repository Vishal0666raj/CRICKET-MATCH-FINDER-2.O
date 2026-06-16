const express = require('express');
const router = express.Router();
const { submitRating } = require('../controllers/ratingController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, submitRating);

module.exports = router;
