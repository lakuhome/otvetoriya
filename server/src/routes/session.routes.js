const express = require('express');

const {
  getByRoomCode,
  getState,
  getResults,
} = require('../controllers/session.controller');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(requireAuth);

router.get('/by-code/:roomCode', getByRoomCode);
router.get('/:sessionId', getState);
router.get('/:sessionId/results', getResults);

module.exports = router;

