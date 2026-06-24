const { getClient, query } = require('../db/pool');
const { HttpError } = require('../utils/http-error');

async function createSession(user, quizId) {
  assertOrganizer(user);

  try {
    const result = await query(
      `
        SELECT session_id, room_code
        FROM fn_create_game_session($1, $2)
      `,
      [quizId, user.id]
    );

    if (result.rows.length === 0) {
      throw new HttpError(500, 'Failed to create game session', 'INTERNAL_ERROR');
    }

    return {
      sessionId: result.rows[0].session_id,
      roomCode: result.rows[0].room_code,
      status: 'lobby',
    };
  } catch (error) {
    throw mapSessionDatabaseError(error);
  }
}

async function getSessionByRoomCode(roomCode) {
  const normalizedRoomCode = normalizeRoomCode(roomCode);

  const result = await query(
    `
      SELECT
        gs.id AS session_id,
        gs.room_code,
        gs.status,
        gs.quiz_id,
        q.title AS quiz_title,
        gs.host_id,
        u.display_name AS host_display_name,
        COUNT(gp.id)::int AS participants_count
      FROM game_sessions AS gs
      JOIN quizzes AS q
        ON q.id = gs.quiz_id
      JOIN users AS u
        ON u.id = gs.host_id
      LEFT JOIN game_participants AS gp
        ON gp.session_id = gs.id
      WHERE gs.room_code = $1
      GROUP BY gs.id, q.title, u.display_name
    `,
    [normalizedRoomCode]
  );

  if (result.rows.length === 0) {
    throw new HttpError(404, 'Room not found', 'ROOM_NOT_FOUND');
  }

  const row = result.rows[0];

  return {
    sessionId: row.session_id,
    roomCode: row.room_code,
    status: row.status,
    quizId: row.quiz_id,
    quizTitle: row.quiz_title,
    hostId: row.host_id,
    hostDisplayName: row.host_display_name,
    participantsCount: row.participants_count,
  };
}

async function getSessionState(sessionId, user) {
  let session = await loadAccessibleSession(sessionId, user);

  if (
    session.status === 'question_open' &&
    session.questionEndsAt &&
    new Date(session.questionEndsAt) <= new Date()
  ) {
    await closeExpiredQuestionIfNeeded(sessionId);
    session = await loadAccessibleSession(sessionId, user);
  }

  const participants = await loadSessionParticipants(sessionId);
  const leaderboard =
    session.status === 'question_open'
      ? []
      : await getLeaderboard(sessionId, user, { skipAccessCheck: true });
  const currentQuestion = await loadCurrentQuestion(session.currentQuestionId);
  const hasSubmittedCurrentQuestion =
    user.role === 'participant' && session.currentQuestionId
      ? await hasParticipantSubmittedCurrentQuestion(sessionId, user.id, session.currentQuestionId)
      : false;

  return {
    session,
    participants,
    leaderboard,
    currentQuestion,
    hasSubmittedCurrentQuestion,
  };
}

async function getLeaderboard(sessionId, user, options = {}) {
  let session = null;

  if (!options.skipAccessCheck) {
    session = await loadAccessibleSession(sessionId, user);

    if (
      session.status === 'question_open' &&
      session.questionEndsAt &&
      new Date(session.questionEndsAt) <= new Date()
    ) {
      await closeExpiredQuestionIfNeeded(sessionId);
      session = await loadAccessibleSession(sessionId, user);
    }
  }

  if (session && session.status === 'question_open') {
    return [];
  }

  const result = await query(
    `
      SELECT
        place,
        participant_id,
        nickname,
        score,
        correct_answers,
        total_response_time_ms
      FROM fn_get_leaderboard($1)
    `,
    [sessionId]
  );

  return result.rows.map((row) => ({
    place: Number(row.place),
    participantId: row.participant_id,
    nickname: row.nickname,
    score: row.score,
    correctAnswers: Number(row.correct_answers),
    totalResponseTimeMs: Number(row.total_response_time_ms),
  }));
}

async function getParticipantHistory(userId) {
  const result = await query(
    `
      SELECT
        user_id,
        session_id,
        quiz_title,
        session_date,
        score,
        place,
        participants_count
      FROM v_participant_history
      WHERE user_id = $1
      ORDER BY session_date DESC, session_id DESC
    `,
    [userId]
  );

  return result.rows.map((row) => ({
    userId: row.user_id,
    sessionId: row.session_id,
    quizTitle: row.quiz_title,
    sessionDate: row.session_date,
    score: row.score,
    place: Number(row.place),
    participantsCount: Number(row.participants_count),
  }));
}

async function getHostedSessionsHistory(userId) {
  const result = await query(
    `
      SELECT
        host_id,
        session_id,
        quiz_id,
        quiz_title,
        created_at,
        finished_at,
        status,
        participants_count,
        winner_name,
        winner_score
      FROM v_hosted_sessions
      WHERE host_id = $1
      ORDER BY created_at DESC, session_id DESC
    `,
    [userId]
  );

  return result.rows.map((row) => ({
    hostId: row.host_id,
    sessionId: row.session_id,
    quizId: row.quiz_id,
    quizTitle: row.quiz_title,
    createdAt: row.created_at,
    finishedAt: row.finished_at,
    status: row.status,
    participantsCount: Number(row.participants_count),
    winnerName: row.winner_name,
    winnerScore: row.winner_score,
  }));
}

async function joinSessionByRoomCode(roomCode, user) {
  if (user.role !== 'participant') {
    throw new HttpError(403, 'Only participants can join a room by code', 'FORBIDDEN');
  }

  try {
    const result = await query(
      `
        SELECT session_id, participant_id, session_status
        FROM fn_join_game_session($1, $2)
      `,
      [normalizeRoomCode(roomCode), user.id]
    );

    if (result.rows.length === 0) {
      throw new HttpError(500, 'Failed to join game session', 'INTERNAL_ERROR');
    }

    const row = result.rows[0];
    const state = await getSessionState(row.session_id, user);

    return {
      sessionId: row.session_id,
      participantId: row.participant_id,
      status: row.session_status,
      state,
    };
  } catch (error) {
    throw mapSessionDatabaseError(error);
  }
}

async function openNextQuestion(sessionId, user) {
  assertOrganizer(user);

  const client = await getClient();

  try {
    await client.query('BEGIN');

    const session = await loadHostSessionForUpdate(client, sessionId, user.id);

    if (session.status === 'question_open') {
      if (session.question_ends_at && new Date(session.question_ends_at) <= new Date()) {
        await closeQuestionInTransaction(client, sessionId);
        session.status = 'question_closed';
      } else {
        throw new HttpError(409, 'Question is already open', 'CONFLICT');
      }
    }

    if (session.status === 'finished') {
      throw new HttpError(409, 'Game session is already finished', 'ROOM_FINISHED');
    }

    const nextQuestionId = await findNextQuestionId(client, session);

    if (!nextQuestionId) {
      throw new HttpError(409, 'No more questions available', 'CONFLICT');
    }

    const openResult = await client.query(
      `
        SELECT question_started_at, question_ends_at
        FROM fn_open_question($1, $2, $3)
      `,
      [sessionId, user.id, nextQuestionId]
    );

    await client.query('COMMIT');

    const state = await getSessionState(sessionId, user);
    const question = await loadCurrentQuestion(nextQuestionId);

    return {
      state,
      openedQuestion: {
        question,
        startedAt: openResult.rows[0].question_started_at,
        endsAt: openResult.rows[0].question_ends_at,
      },
      wasLobbyStart: session.status === 'lobby',
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw mapSessionDatabaseError(error);
  } finally {
    client.release();
  }
}

async function finishSession(sessionId, user) {
  assertOrganizer(user);

  try {
    await query('CALL sp_finish_game_session($1, $2)', [sessionId, user.id]);
    return getSessionState(sessionId, user);
  } catch (error) {
    throw mapSessionDatabaseError(error);
  }
}

async function submitAnswer({ sessionId, user, questionId, optionIds }) {
  if (user.role !== 'participant') {
    throw new HttpError(403, 'Only participants can submit answers', 'FORBIDDEN');
  }

  const normalizedOptionIds = normalizeOptionIds(optionIds);

  try {
    const result = await query(
      `
        SELECT is_correct, awarded_points, response_time_ms, new_score
        FROM fn_submit_answer($1, $2, $3, $4)
      `,
      [sessionId, user.id, questionId, normalizedOptionIds]
    );

    if (result.rows.length === 0) {
      throw new HttpError(500, 'Failed to submit answer', 'INTERNAL_ERROR');
    }

    const row = result.rows[0];

    return {
      isCorrect: row.is_correct,
      awardedPoints: row.awarded_points,
      responseTimeMs: row.response_time_ms,
      newScore: row.new_score,
    };
  } catch (error) {
    throw mapSessionDatabaseError(error);
  }
}

async function closeExpiredQuestionIfNeeded(sessionId) {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    const sessionResult = await client.query(
      `
        SELECT id, status, question_ends_at
        FROM game_sessions
        WHERE id = $1
        FOR UPDATE
      `,
      [sessionId]
    );

    if (sessionResult.rows.length === 0) {
      throw new HttpError(404, 'Room not found', 'ROOM_NOT_FOUND');
    }

    const session = sessionResult.rows[0];

    if (
      session.status === 'question_open' &&
      session.question_ends_at &&
      new Date(session.question_ends_at) <= new Date()
    ) {
      await closeQuestionInTransaction(client, sessionId);
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function forceCloseQuestion(sessionId) {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    const result = await closeQuestionInTransaction(client, sessionId);
    await client.query('COMMIT');

    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function closeQuestionInTransaction(client, sessionId) {
  const result = await client.query(
    `
      UPDATE game_sessions
      SET status = 'question_closed'
      WHERE id = $1
        AND status = 'question_open'
      RETURNING id, current_question_id
    `,
    [sessionId]
  );

  return result.rows[0] || null;
}

async function loadAccessibleSession(sessionId, user) {
  const result = await query(
    `
      SELECT
        gs.id,
        gs.quiz_id,
        gs.host_id,
        gs.room_code,
        gs.status,
        gs.current_question_id,
        gs.question_started_at,
        gs.question_ends_at,
        gs.created_at,
        gs.finished_at,
        q.title AS quiz_title,
        q.time_per_question_seconds,
        EXISTS (
          SELECT 1
          FROM game_participants AS gp
          WHERE gp.session_id = gs.id
            AND gp.user_id = $2
        ) AS is_joined_participant
      FROM game_sessions AS gs
      JOIN quizzes AS q
        ON q.id = gs.quiz_id
      WHERE gs.id = $1
    `,
    [sessionId, user.id]
  );

  if (result.rows.length === 0) {
    throw new HttpError(404, 'Room not found', 'ROOM_NOT_FOUND');
  }

  const row = result.rows[0];

  if (user.role === 'organizer') {
    if (row.host_id !== user.id) {
      throw new HttpError(403, 'Only the host can access this session', 'FORBIDDEN');
    }
  } else if (!row.is_joined_participant) {
    throw new HttpError(403, 'Participant has not joined this room', 'FORBIDDEN');
  }

  return {
    id: row.id,
    quizId: row.quiz_id,
    quizTitle: row.quiz_title,
    hostId: row.host_id,
    roomCode: row.room_code,
    status: row.status,
    currentQuestionId: row.current_question_id,
    questionStartedAt: row.question_started_at,
    questionEndsAt: row.question_ends_at,
    createdAt: row.created_at,
    finishedAt: row.finished_at,
    timePerQuestionSeconds: row.time_per_question_seconds,
  };
}

async function loadSessionParticipants(sessionId) {
  const result = await query(
    `
      SELECT
        id,
        user_id,
        nickname,
        score,
        total_response_time_ms,
        joined_at
      FROM game_participants
      WHERE session_id = $1
      ORDER BY joined_at ASC, id ASC
    `,
    [sessionId]
  );

  return result.rows.map((row) => ({
    participantId: row.id,
    userId: row.user_id,
    nickname: row.nickname,
    score: row.score,
    totalResponseTimeMs: Number(row.total_response_time_ms),
    joinedAt: row.joined_at,
  }));
}

async function loadCurrentQuestion(questionId) {
  if (!questionId) {
    return null;
  }

  const result = await query(
    `
      SELECT
        q.id,
        q.text,
        q.image_url,
        q.type,
        q.position,
        ao.id AS option_id,
        ao.text AS option_text,
        ao.position AS option_position
      FROM questions AS q
      LEFT JOIN answer_options AS ao
        ON ao.question_id = q.id
      WHERE q.id = $1
      ORDER BY ao.position ASC, ao.id ASC
    `,
    [questionId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return {
    id: result.rows[0].id,
    text: result.rows[0].text,
    imageUrl: result.rows[0].image_url,
    type: result.rows[0].type,
    position: result.rows[0].position,
    options: result.rows
      .filter((row) => row.option_id !== null)
      .map((row) => ({
        id: row.option_id,
        text: row.option_text,
        position: row.option_position,
      })),
  };
}

async function hasParticipantSubmittedCurrentQuestion(sessionId, userId, questionId) {
  const result = await query(
    `
      SELECT EXISTS (
        SELECT 1
        FROM submissions AS s
        JOIN game_participants AS gp
          ON gp.id = s.participant_id
        WHERE s.session_id = $1
          AND s.question_id = $2
          AND gp.user_id = $3
      ) AS has_submitted
    `,
    [sessionId, questionId, userId]
  );

  return result.rows[0].has_submitted;
}

async function loadHostSessionForUpdate(client, sessionId, hostId) {
  const result = await client.query(
    `
      SELECT id, quiz_id, host_id, status, current_question_id, question_ends_at
      FROM game_sessions
      WHERE id = $1
        AND host_id = $2
      FOR UPDATE
    `,
    [sessionId, hostId]
  );

  if (result.rows.length === 0) {
    throw new HttpError(404, 'Room not found', 'ROOM_NOT_FOUND');
  }

  return result.rows[0];
}

async function findNextQuestionId(client, session) {
  if (!session.current_question_id) {
    const result = await client.query(
      `
        SELECT id
        FROM questions
        WHERE quiz_id = $1
        ORDER BY position ASC, id ASC
        LIMIT 1
      `,
      [session.quiz_id]
    );

    return result.rows[0] ? result.rows[0].id : null;
  }

  const currentQuestionResult = await client.query(
    'SELECT position FROM questions WHERE id = $1',
    [session.current_question_id]
  );

  if (currentQuestionResult.rows.length === 0) {
    return null;
  }

  const currentPosition = currentQuestionResult.rows[0].position;

  const nextQuestionResult = await client.query(
    `
      SELECT id
      FROM questions
      WHERE quiz_id = $1
        AND position > $2
      ORDER BY position ASC, id ASC
      LIMIT 1
    `,
    [session.quiz_id, currentPosition]
  );

  return nextQuestionResult.rows[0] ? nextQuestionResult.rows[0].id : null;
}

function normalizeRoomCode(roomCode) {
  const normalized = typeof roomCode === 'string' ? roomCode.trim() : '';

  if (!/^\d{6}$/.test(normalized)) {
    throw new HttpError(400, 'roomCode must contain exactly 6 digits', 'VALIDATION_ERROR');
  }

  return normalized;
}

function normalizeOptionIds(optionIds) {
  if (!Array.isArray(optionIds)) {
    throw new HttpError(400, 'optionIds must be an array', 'VALIDATION_ERROR');
  }

  const normalized = optionIds.map((optionId) => Number(optionId));

  if (!normalized.every(Number.isInteger)) {
    throw new HttpError(400, 'optionIds must contain only integers', 'VALIDATION_ERROR');
  }

  const uniqueIds = [...new Set(normalized)];

  if (uniqueIds.length !== normalized.length) {
    throw new HttpError(400, 'optionIds must not contain duplicates', 'VALIDATION_ERROR');
  }

  return uniqueIds;
}

function assertOrganizer(user) {
  if (!user || user.role !== 'organizer') {
    throw new HttpError(403, 'Only organizers can perform this action', 'FORBIDDEN');
  }
}

function mapSessionDatabaseError(error) {
  if (error instanceof HttpError) {
    return error;
  }

  const message = error && error.message ? error.message : 'Database error';

  if (message === 'Quiz not found') {
    return new HttpError(404, message, 'QUIZ_NOT_FOUND');
  }

  if (message === 'Question not found') {
    return new HttpError(404, message, 'QUESTION_NOT_FOUND');
  }

  if (message === 'Game session not found') {
    return new HttpError(404, 'Room not found', 'ROOM_NOT_FOUND');
  }

  if (message === 'Game session is already finished') {
    return new HttpError(409, message, 'ROOM_FINISHED');
  }

  if (message === 'Only participants can join a game session') {
    return new HttpError(403, message, 'FORBIDDEN');
  }

  if (message === 'Participant already answered this question') {
    return new HttpError(409, message, 'ANSWER_ALREADY_SUBMITTED');
  }

  if (message === 'Answers are accepted only when question is open' || message === 'Answer deadline has passed') {
    return new HttpError(409, message, 'QUESTION_CLOSED');
  }

  if (
    message === 'Some answer options do not belong to the current question' ||
    message === 'Duplicate answer options are not allowed'
  ) {
    return new HttpError(400, message, 'INVALID_ANSWER_OPTIONS');
  }

  if (
    message === 'Only quiz owner can create a game session' ||
    message === 'Only host can open a question' ||
    message === 'Only host can finish a game session' ||
    message === 'Participant is not part of this session'
  ) {
    return new HttpError(403, message, 'FORBIDDEN');
  }

  if (
    message === 'Quiz must be in ready status' ||
    message === 'Quiz must contain at least one question' ||
    message === 'Question does not belong to session quiz' ||
    message === 'Question does not match current session question' ||
    message === 'Question can only be opened from lobby or question_closed status'
  ) {
    return new HttpError(409, message, 'CONFLICT');
  }

  return error;
}

module.exports = {
  createSession,
  getSessionByRoomCode,
  getSessionState,
  getLeaderboard,
  getParticipantHistory,
  getHostedSessionsHistory,
  joinSessionByRoomCode,
  openNextQuestion,
  finishSession,
  submitAnswer,
  closeExpiredQuestionIfNeeded,
  forceCloseQuestion,
};
