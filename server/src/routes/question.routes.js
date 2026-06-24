const express = require('express');

const {
  updateQuizQuestion,
  deleteQuizQuestion,
} = require('../controllers/quiz.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');

const router = express.Router();

router.use(requireAuth);
router.use(requireRole('organizer'));

router.patch('/:questionId', updateQuizQuestion);
router.delete('/:questionId', deleteQuizQuestion);

module.exports = router;

