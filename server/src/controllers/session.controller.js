const { HttpError } = require('../utils/http-error');
const {
  createSession,
  getSessionByRoomCode,
  getSessionState,
  getLeaderboard,
  getParticipantHistory,
  getHostedSessionsHistory,
} = require('../services/session.service');

async function createGameSession(req, res, next) {
  try {
    const quizId = parseId(req.params.quizId, 'quizId');
    const session = await createSession(req.user, quizId);
    res.status(201).json(session);
  } catch (error) {
    next(error);
  }
}

async function getByRoomCode(req, res, next) {
  try {
    const session = await getSessionByRoomCode(req.params.roomCode);
    res.json({ session });
  } catch (error) {
    next(error);
  }
}

async function getState(req, res, next) {
  try {
    const sessionId = parseId(req.params.sessionId, 'sessionId');
    const state = await getSessionState(sessionId, req.user);
    res.json(state);
  } catch (error) {
    next(error);
  }
}

async function getResults(req, res, next) {
  try {
    const sessionId = parseId(req.params.sessionId, 'sessionId');
    const leaderboard = await getLeaderboard(sessionId, req.user);
    res.json({ leaderboard });
  } catch (error) {
    next(error);
  }
}

async function getParticipatedHistory(req, res, next) {
  try {
    const history = await getParticipantHistory(req.user.id);
    res.json({ history });
  } catch (error) {
    next(error);
  }
}

async function getHostedHistory(req, res, next) {
  try {
    const history = await getHostedSessionsHistory(req.user.id);
    res.json({ history });
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
  createGameSession,
  getByRoomCode,
  getState,
  getResults,
  getParticipatedHistory,
  getHostedHistory,
};

