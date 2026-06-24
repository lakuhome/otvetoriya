const express = require('express');

const {
  getParticipatedHistory,
  getHostedHistory,
} = require('../controllers/session.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');

const router = express.Router();

router.use(requireAuth);

router.get('/participated', requireRole('participant'), getParticipatedHistory);
router.get('/hosted', requireRole('organizer'), getHostedHistory);

module.exports = router;

