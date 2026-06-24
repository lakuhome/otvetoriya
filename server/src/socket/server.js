const { Server } = require('socket.io');

const { query } = require('../db/pool');
const { verifyAccessToken } = require('../utils/jwt');
const { HttpError } = require('../utils/http-error');
const {
  joinSessionByRoomCode,
  getSessionState,
  openNextQuestion,
  submitAnswer,
  finishSession,
  getLeaderboard,
  forceCloseQuestion,
} = require('../services/session.service');
const { scheduleQuestionClose, clearQuestionTimer } = require('./timers');

function createSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: true,
      credentials: true,
    },
  });

  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    socket.on('disconnecting', () => {
      if (socket.data.sessionId && socket.data.participantId) {
        socket.to(getRoomName(socket.data.sessionId)).emit('participant:left', {
          participantId: socket.data.participantId,
          userId: socket.data.user.id,
        });
      }
    });

    socket.on('room:join', async (payload, acknowledge = () => {}) => {
      try {
        const result = await joinSessionByRoomCode(payload.roomCode, socket.data.user);
        const roomName = getRoomName(result.sessionId);

        await socket.join(roomName);

        socket.data.sessionId = result.sessionId;
        socket.data.participantId = result.participantId;

        socket.to(roomName).emit('participant:joined', {
          participantId: result.participantId,
          userId: socket.data.user.id,
        });

        io.to(roomName).emit('room:state', result.state);

        acknowledge({
          ok: true,
          sessionId: result.sessionId,
          participantId: result.participantId,
          status: result.status,
          state: result.state,
        });
      } catch (error) {
        handleSocketError(socket, error, acknowledge);
      }
    });

    socket.on('session:sync', async (payload, acknowledge = () => {}) => {
      try {
        const sessionId = parseSessionId(payload.sessionId);
        const state = await getSessionState(sessionId, socket.data.user);

        await socket.join(getRoomName(sessionId));
        socket.data.sessionId = sessionId;

        acknowledge({
          ok: true,
          state,
        });
      } catch (error) {
        handleSocketError(socket, error, acknowledge);
      }
    });

    socket.on('host:start', async (payload, acknowledge = () => {}) => {
      try {
        const sessionId = parseSessionId(payload.sessionId);
        const result = await openAndBroadcastQuestion(io, sessionId, socket.data.user);

        acknowledge({
          ok: true,
          state: result.state,
        });
      } catch (error) {
        handleSocketError(socket, error, acknowledge);
      }
    });

    socket.on('host:next-question', async (payload, acknowledge = () => {}) => {
      try {
        const sessionId = parseSessionId(payload.sessionId);
        const result = await openAndBroadcastQuestion(io, sessionId, socket.data.user);

        acknowledge({
          ok: true,
          state: result.state,
        });
      } catch (error) {
        handleSocketError(socket, error, acknowledge);
      }
    });

    socket.on('answer:submit', async (payload, acknowledge = () => {}) => {
      try {
        const sessionId = parseSessionId(payload.sessionId);
        const questionId = parseQuestionId(payload.questionId);

        const result = await submitAnswer({
          sessionId,
          user: socket.data.user,
          questionId,
          optionIds: payload.optionIds,
        });

        const state = await getSessionState(sessionId, socket.data.user);

        socket.emit('answer:accepted', {
          message: 'Ответ принят',
        });

        acknowledge({
          ok: true,
          message: 'Ответ принят',
          result: {
            awardedPoints: result.awardedPoints,
            responseTimeMs: result.responseTimeMs,
            newScore: result.newScore,
          },
          state,
        });
      } catch (error) {
        socket.emit('answer:rejected', {
          code: mapSocketErrorCode(error),
          message: error.message || 'Ответ не принят',
        });
        handleSocketError(socket, error, acknowledge);
      }
    });

    socket.on('host:finish', async (payload, acknowledge = () => {}) => {
      try {
        const sessionId = parseSessionId(payload.sessionId);
        clearQuestionTimer(sessionId);

        const state = await finishSession(sessionId, socket.data.user);
        const leaderboard = await getLeaderboard(sessionId, socket.data.user, {
          skipAccessCheck: true,
        });

        io.to(getRoomName(sessionId)).emit('quiz:finished', {
          session: state.session,
          leaderboard,
        });

        acknowledge({
          ok: true,
          state,
        });
      } catch (error) {
        handleSocketError(socket, error, acknowledge);
      }
    });
  });

  return io;
}

async function authenticateSocket(socket, next) {
  try {
    const token = socket.handshake.auth && socket.handshake.auth.token;

    if (!token || typeof token !== 'string') {
      throw new HttpError(401, 'Authorization token is required', 'UNAUTHORIZED');
    }

    const payload = verifyAccessToken(token);
    const result = await query(
      `
        SELECT id, email, display_name, role
        FROM users
        WHERE id = $1
      `,
      [payload.userId]
    );

    if (result.rows.length === 0) {
      throw new HttpError(401, 'User not found', 'UNAUTHORIZED');
    }

    socket.data.user = {
      id: result.rows[0].id,
      email: result.rows[0].email,
      displayName: result.rows[0].display_name,
      role: result.rows[0].role,
    };

    next();
  } catch (error) {
    next(error);
  }
}

async function openAndBroadcastQuestion(io, sessionId, user) {
  const result = await openNextQuestion(sessionId, user);
  const roomName = getRoomName(sessionId);

  if (result.wasLobbyStart) {
    io.to(roomName).emit('quiz:started', {
      sessionId,
    });
  }

  io.to(roomName).emit('question:opened', result.openedQuestion);
  io.to(roomName).emit('room:state', result.state);

  scheduleQuestionClose(sessionId, result.openedQuestion.endsAt, async () => {
    try {
      await closeQuestionAndBroadcast(io, sessionId, user);
    } catch (error) {
      console.error(error);
    }
  });

  return result;
}

async function closeQuestionAndBroadcast(io, sessionId, user) {
  const closed = await forceCloseQuestion(sessionId);

  if (!closed) {
    return;
  }

  const roomName = getRoomName(sessionId);
  const leaderboard = await getLeaderboard(sessionId, user, {
    skipAccessCheck: true,
  });
  const state = await getSessionState(sessionId, user);

  io.to(roomName).emit('question:closed', {
    sessionId,
    questionId: closed.current_question_id,
  });
  io.to(roomName).emit('leaderboard:updated', leaderboard);
  io.to(roomName).emit('room:state', state);
}

function handleSocketError(socket, error, acknowledge) {
  const code = mapSocketErrorCode(error);
  const message = error.message || 'Internal error';

  socket.emit('session:error', {
    code,
    message,
  });

  acknowledge({
    ok: false,
    code,
    message,
  });
}

function mapSocketErrorCode(error) {
  if (error && typeof error.code === 'string') {
    return error.code;
  }

  return 'INTERNAL_ERROR';
}

function getRoomName(sessionId) {
  return `session:${sessionId}`;
}

function parseSessionId(value) {
  const sessionId = Number(value);

  if (!Number.isInteger(sessionId)) {
    throw new HttpError(400, 'sessionId must be an integer', 'VALIDATION_ERROR');
  }

  return sessionId;
}

function parseQuestionId(value) {
  const questionId = Number(value);

  if (!Number.isInteger(questionId)) {
    throw new HttpError(400, 'questionId must be an integer', 'VALIDATION_ERROR');
  }

  return questionId;
}

module.exports = {
  createSocketServer,
};
