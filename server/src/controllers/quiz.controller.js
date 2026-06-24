const { HttpError } = require('../utils/http-error');
const {
  listQuizzesForOrganizer,
  createQuiz,
  getQuizByIdForOwner,
  updateQuiz,
  deleteQuiz,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  reorderQuestions,
} = require('../services/quiz.service');

async function list(req, res, next) {
  try {
    const quizzes = await listQuizzesForOrganizer(req.user.id);
    res.json({ quizzes });
  } catch (error) {
    next(error);
  }
}

async function create(req, res, next) {
  try {
    const quiz = await createQuiz(req.user, req.body);
    res.status(201).json({ quiz });
  } catch (error) {
    next(error);
  }
}

async function getById(req, res, next) {
  try {
    const quizId = parseId(req.params.quizId, 'quizId');
    const quiz = await getQuizByIdForOwner(quizId, req.user.id);
    res.json({ quiz });
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    const quizId = parseId(req.params.quizId, 'quizId');
    const quiz = await updateQuiz(req.user, quizId, req.body);
    res.json({ quiz });
  } catch (error) {
    next(error);
  }
}

async function remove(req, res, next) {
  try {
    const quizId = parseId(req.params.quizId, 'quizId');
    const result = await deleteQuiz(req.user, quizId);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function createQuizQuestion(req, res, next) {
  try {
    const quizId = parseId(req.params.quizId, 'quizId');
    const quiz = await createQuestion(req.user, quizId, req.body);
    res.status(201).json({ quiz });
  } catch (error) {
    next(error);
  }
}

async function updateQuizQuestion(req, res, next) {
  try {
    const questionId = parseId(req.params.questionId, 'questionId');
    const quiz = await updateQuestion(req.user, questionId, req.body);
    res.json({ quiz });
  } catch (error) {
    next(error);
  }
}

async function deleteQuizQuestion(req, res, next) {
  try {
    const questionId = parseId(req.params.questionId, 'questionId');
    const quiz = await deleteQuestion(req.user, questionId);
    res.json({ quiz });
  } catch (error) {
    next(error);
  }
}

async function reorderQuizQuestions(req, res, next) {
  try {
    const quizId = parseId(req.params.quizId, 'quizId');
    const quiz = await reorderQuestions(req.user, quizId, req.body.questionIds);
    res.json({ quiz });
  } catch (error) {
    next(error);
  }
}

function parseId(value, fieldName) {
  const id = Number(value);

  if (!Number.isInteger(id)) {
    throw new HttpError(400, `${fieldName} must be an integer`, 'VALIDATION_ERROR');
  }

  return id;
}

module.exports = {
  list,
  create,
  getById,
  update,
  remove,
  createQuizQuestion,
  updateQuizQuestion,
  deleteQuizQuestion,
  reorderQuizQuestions,
};
