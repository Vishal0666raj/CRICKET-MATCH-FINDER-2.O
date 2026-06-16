const express = require('express');
const router = express.Router();
const {
  getDashboardTelemetry,
  getAllUsers,
  banUser,
  unbanUser,
  getAllMatches,
  deleteMatch,
  getAllReports,
  resolveReport
} = require('../controllers/adminController');
const { protect, admin } = require('../middleware/authMiddleware');

router.use(protect);
router.use(admin);

router.get('/dashboard', getDashboardTelemetry);
router.get('/users', getAllUsers);
router.put('/users/:id/ban', banUser);
router.put('/users/:id/unban', unbanUser);
router.get('/matches', getAllMatches);
router.delete('/matches/:id', deleteMatch);
router.get('/reports', getAllReports);
router.put('/reports/:id/resolve', resolveReport);

module.exports = router;
