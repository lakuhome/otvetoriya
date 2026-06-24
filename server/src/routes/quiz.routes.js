const express = require('express');

const {
  list,
  create,
  getById,
  update,
  remove,
  createQuizQuestion,
  reorderQuizQuestions,
} = require('../controllers/quiz.controller');
const { createGameSession } = require('../controllers/session.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');

const router = express.Router();

router.use(requireAuth);
router.use(requireRole('organizer'));

router.get('/', list);
router.post('/', create);
router.get('/:quizId', getById);
router.patch('/:quizId', update);
router.delete('/:quizId', remove);
router.post('/:quizId/questions', createQuizQuestion);
router.patch('/:quizId/questions/order', reorderQuizQuestions);
router.post('/:quizId/sessions', createGameSession);

module.exports = router;
