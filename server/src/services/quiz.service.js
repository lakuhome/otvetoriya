const { getClient, query } = require('../db/pool');
const { HttpError } = require('../utils/http-error');

async function listQuizzesForOrganizer(userId) {
  const result = await query(
    `
      SELECT
        q.id,
        q.owner_id,
        q.title,
        q.description,
        q.rules,
        q.time_per_question_seconds,
        q.status,
        q.created_at,
        q.updated_at,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', c.id,
              'name', c.name
            )
          ) FILTER (WHERE c.id IS NOT NULL),
          '[]'::json
        ) AS categories,
        COUNT(DISTINCT qs.id) AS question_count
      FROM quizzes AS q
      LEFT JOIN quiz_categories AS qc
        ON qc.quiz_id = q.id
      LEFT JOIN categories AS c
        ON c.id = qc.category_id
      LEFT JOIN questions AS qs
        ON qs.quiz_id = q.id
      WHERE q.owner_id = $1
      GROUP BY q.id
      ORDER BY q.updated_at DESC, q.id DESC
    `,
    [userId]
  );

  return result.rows.map(mapQuizSummary);
}

async function createQuiz(user, input) {
  assertOrganizer(user);

  const title = normalizeNullableString(input.title);
  const description = normalizeOptionalText(input.description);
  const rules = normalizeOptionalText(input.rules);
  const timePerQuestionSeconds = Number(input.timePerQuestionSeconds);
  const categoryIds = normalizeIdArray(input.categoryIds);

  validateQuizInput({
    title,
    timePerQuestionSeconds,
    categoryIds,
  });

  const client = await getClient();

  try {
    await client.query('BEGIN');
    await ensureCategoriesExist(client, categoryIds);

    const insertQuizResult = await client.query(
      `
        INSERT INTO quizzes (
          owner_id,
          title,
          description,
          rules,
          time_per_question_seconds,
          status
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `,
      [user.id, title, description, rules, timePerQuestionSeconds, 'draft']
    );

    const quizId = insertQuizResult.rows[0].id;

    await replaceQuizCategories(client, quizId, categoryIds);
    await client.query('COMMIT');

    return getQuizByIdForOwner(quizId, user.id);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function getQuizByIdForOwner(quizId, ownerId) {
  const quiz = await loadOwnedQuiz(quizId, ownerId);
  const questions = await loadQuizQuestions(quizId);

  return {
    ...quiz,
    questions,
  };
}

async function updateQuiz(user, quizId, input) {
  assertOrganizer(user);

  const client = await getClient();

  try {
    await client.query('BEGIN');

    await loadOwnedQuizForUpdate(client, quizId, user.id);
    const existingQuiz = await loadOwnedQuiz(quizId, user.id);
    await ensureQuizIsMutable(client, quizId);

    const nextTitle =
      input.title === undefined ? existingQuiz.title : normalizeNullableString(input.title);
    const nextDescription =
      input.description === undefined
        ? existingQuiz.description
        : normalizeOptionalText(input.description);
    const nextRules =
      input.rules === undefined ? existingQuiz.rules : normalizeOptionalText(input.rules);
    const nextTime =
      input.timePerQuestionSeconds === undefined
        ? existingQuiz.timePerQuestionSeconds
        : Number(input.timePerQuestionSeconds);
    const nextCategoryIds =
      input.categoryIds === undefined
        ? existingQuiz.categories.map((category) => category.id)
        : normalizeIdArray(input.categoryIds);

    validateQuizInput({
      title: nextTitle,
      timePerQuestionSeconds: nextTime,
      categoryIds: nextCategoryIds,
    });

    await ensureCategoriesExist(client, nextCategoryIds);

    await client.query(
      `
        UPDATE quizzes
        SET title = $2,
            description = $3,
            rules = $4,
            time_per_question_seconds = $5,
            updated_at = now()
        WHERE id = $1
      `,
      [quizId, nextTitle, nextDescription, nextRules, nextTime]
    );

    await replaceQuizCategories(client, quizId, nextCategoryIds);
    await client.query('COMMIT');

    return getQuizByIdForOwner(quizId, user.id);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function deleteQuiz(user, quizId) {
  assertOrganizer(user);

  const client = await getClient();

  try {
    await client.query('BEGIN');

    await loadOwnedQuizForUpdate(client, quizId, user.id);

    const sessionResult = await client.query(
      'SELECT COUNT(*)::int AS count FROM game_sessions WHERE quiz_id = $1',
      [quizId]
    );

    const hasSessions = sessionResult.rows[0].count > 0;

    if (hasSessions) {
      await client.query(
        `
          UPDATE quizzes
          SET status = 'archived',
              updated_at = now()
          WHERE id = $1
        `,
        [quizId]
      );

      await client.query('COMMIT');

      return {
        action: 'archived',
      };
    }

    await client.query('DELETE FROM quizzes WHERE id = $1', [quizId]);
    await client.query('COMMIT');

    return {
      action: 'deleted',
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function createQuestion(user, quizId, input) {
  assertOrganizer(user);

  const client = await getClient();

  try {
    await client.query('BEGIN');

    await loadOwnedQuizForUpdate(client, quizId, user.id);
    await ensureQuizIsMutable(client, quizId);

    const questionPayload = normalizeQuestionInput(input);
    validateQuestionInput(questionPayload);

    if (questionPayload.categoryId !== null) {
      await ensureSingleCategoryExists(client, questionPayload.categoryId);
    }

    const positionResult = await client.query(
      `
        SELECT COALESCE(MAX(position), 0) + 1 AS next_position
        FROM questions
        WHERE quiz_id = $1
      `,
      [quizId]
    );

    const nextPosition = Number(positionResult.rows[0].next_position);

    const questionResult = await client.query(
      `
        INSERT INTO questions (
          quiz_id,
          category_id,
          text,
          image_url,
          type,
          position,
          points
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `,
      [
        quizId,
        questionPayload.categoryId,
        questionPayload.text,
        questionPayload.imageUrl,
        questionPayload.type,
        nextPosition,
        questionPayload.points,
      ]
    );

    const questionId = questionResult.rows[0].id;
    await insertQuestionOptions(client, questionId, questionPayload.options);

    await client.query(
      `
        UPDATE quizzes
        SET updated_at = now()
        WHERE id = $1
      `,
      [quizId]
    );
    await syncQuizStatusBasedOnQuestions(client, quizId);

    await client.query('COMMIT');

    return getQuizByIdForOwner(quizId, user.id);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function updateQuestion(user, questionId, input) {
  assertOrganizer(user);

  const client = await getClient();

  try {
    await client.query('BEGIN');

    const questionRecord = await loadOwnedQuestionForUpdate(client, questionId, user.id);
    await ensureQuizIsMutable(client, questionRecord.quiz_id);

    const existingQuestion = await loadSingleQuestion(client, questionId);

    const nextQuestion = {
      text:
        input.text === undefined ? existingQuestion.text : normalizeOptionalText(input.text),
      imageUrl:
        input.imageUrl === undefined
          ? existingQuestion.imageUrl
          : normalizeOptionalText(input.imageUrl),
      categoryId:
        input.categoryId === undefined
          ? existingQuestion.categoryId
          : normalizeNullableId(input.categoryId),
      type: input.type === undefined ? existingQuestion.type : input.type,
      points:
        input.points === undefined ? existingQuestion.points : Number(input.points),
      options:
        input.options === undefined
          ? existingQuestion.options
          : normalizeQuestionOptions(input.options),
    };

    validateQuestionInput(nextQuestion);

    if (nextQuestion.categoryId !== null) {
      await ensureSingleCategoryExists(client, nextQuestion.categoryId);
    }

    await client.query(
      `
        UPDATE questions
        SET category_id = $2,
            text = $3,
            image_url = $4,
            type = $5,
            points = $6,
            updated_at = now()
        WHERE id = $1
      `,
      [
        questionId,
        nextQuestion.categoryId,
        nextQuestion.text,
        nextQuestion.imageUrl,
        nextQuestion.type,
        nextQuestion.points,
      ]
    );

    await client.query('DELETE FROM answer_options WHERE question_id = $1', [questionId]);
    await insertQuestionOptions(client, questionId, nextQuestion.options);

    await client.query(
      `
        UPDATE quizzes
        SET updated_at = now()
        WHERE id = $1
      `,
      [questionRecord.quiz_id]
    );
    await syncQuizStatusBasedOnQuestions(client, questionRecord.quiz_id);

    await client.query('COMMIT');

    return getQuizByIdForOwner(questionRecord.quiz_id, user.id);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function deleteQuestion(user, questionId) {
  assertOrganizer(user);

  const client = await getClient();

  try {
    await client.query('BEGIN');

    const questionRecord = await loadOwnedQuestionForUpdate(client, questionId, user.id);
    await ensureQuizIsMutable(client, questionRecord.quiz_id);

    await client.query('DELETE FROM questions WHERE id = $1', [questionId]);

    const reorderResult = await client.query(
      `
        SELECT id
        FROM questions
        WHERE quiz_id = $1
        ORDER BY position ASC, id ASC
      `,
      [questionRecord.quiz_id]
    );

    await rewriteQuestionOrder(client, questionRecord.quiz_id, reorderResult.rows.map((row) => row.id));

    await client.query(
      `
        UPDATE quizzes
        SET updated_at = now()
        WHERE id = $1
      `,
      [questionRecord.quiz_id]
    );
    await syncQuizStatusBasedOnQuestions(client, questionRecord.quiz_id);

    await client.query('COMMIT');

    return getQuizByIdForOwner(questionRecord.quiz_id, user.id);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function reorderQuestions(user, quizId, questionIds) {
  assertOrganizer(user);

  const normalizedQuestionIds = normalizeIdArray(questionIds);

  const client = await getClient();

  try {
    await client.query('BEGIN');

    await loadOwnedQuizForUpdate(client, quizId, user.id);
    await ensureQuizIsMutable(client, quizId);

    const result = await client.query(
      `
        SELECT id
        FROM questions
        WHERE quiz_id = $1
        ORDER BY position ASC, id ASC
      `,
      [quizId]
    );

    const existingIds = result.rows.map((row) => row.id);

    if (existingIds.length !== normalizedQuestionIds.length) {
      throw new HttpError(400, 'questionIds must contain every quiz question exactly once');
    }

    const existingSet = new Set(existingIds);
    const providedSet = new Set(normalizedQuestionIds);

    if (existingSet.size !== providedSet.size) {
      throw new HttpError(400, 'questionIds must not contain duplicates');
    }

    for (const questionId of normalizedQuestionIds) {
      if (!existingSet.has(questionId)) {
        throw new HttpError(400, 'questionIds contain a question from another quiz');
      }
    }

    await rewriteQuestionOrder(client, quizId, normalizedQuestionIds);

    await client.query(
      `
        UPDATE quizzes
        SET updated_at = now()
        WHERE id = $1
      `,
      [quizId]
    );

    await client.query('COMMIT');

    return getQuizByIdForOwner(quizId, user.id);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function loadOwnedQuiz(quizId, ownerId) {
  const result = await query(
    `
      SELECT
        q.id,
        q.owner_id,
        q.title,
        q.description,
        q.rules,
        q.time_per_question_seconds,
        q.status,
        q.created_at,
        q.updated_at,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', c.id,
              'name', c.name
            )
          ) FILTER (WHERE c.id IS NOT NULL),
          '[]'::json
        ) AS categories
      FROM quizzes AS q
      LEFT JOIN quiz_categories AS qc
        ON qc.quiz_id = q.id
      LEFT JOIN categories AS c
        ON c.id = qc.category_id
      WHERE q.id = $1
        AND q.owner_id = $2
      GROUP BY q.id
    `,
    [quizId, ownerId]
  );

  if (result.rows.length === 0) {
    throw new HttpError(404, 'Quiz not found');
  }

  return mapQuizSummary(result.rows[0]);
}

async function loadOwnedQuizForUpdate(client, quizId, ownerId) {
  const result = await client.query(
    `
      SELECT id, owner_id, status
      FROM quizzes
      WHERE id = $1
        AND owner_id = $2
      FOR UPDATE
    `,
    [quizId, ownerId]
  );

  if (result.rows.length === 0) {
    throw new HttpError(404, 'Quiz not found');
  }

  return result.rows[0];
}

async function loadQuizQuestions(quizId) {
  const result = await query(
    `
      SELECT
        q.id AS question_id,
        q.quiz_id,
        q.category_id,
        c.name AS category_name,
        q.text,
        q.image_url,
        q.type,
        q.position,
        q.points,
        q.created_at,
        q.updated_at,
        ao.id AS option_id,
        ao.text AS option_text,
        ao.is_correct,
        ao.position AS option_position
      FROM questions AS q
      LEFT JOIN categories AS c
        ON c.id = q.category_id
      LEFT JOIN answer_options AS ao
        ON ao.question_id = q.id
      WHERE q.quiz_id = $1
      ORDER BY q.position ASC, ao.position ASC, ao.id ASC
    `,
    [quizId]
  );

  const questionsById = new Map();

  for (const row of result.rows) {
    if (!questionsById.has(row.question_id)) {
      questionsById.set(row.question_id, {
        id: row.question_id,
        quizId: row.quiz_id,
        categoryId: row.category_id,
        categoryName: row.category_name,
        text: row.text,
        imageUrl: row.image_url,
        type: row.type,
        position: row.position,
        points: row.points,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        options: [],
      });
    }

    if (row.option_id !== null) {
      questionsById.get(row.question_id).options.push({
        id: row.option_id,
        text: row.option_text,
        isCorrect: row.is_correct,
        position: row.option_position,
      });
    }
  }

  return Array.from(questionsById.values());
}

async function ensureCategoriesExist(client, categoryIds) {
  if (categoryIds.length === 0) {
    return;
  }

  const result = await client.query(
    `
      SELECT id
      FROM categories
      WHERE id = ANY($1::bigint[])
    `,
    [categoryIds]
  );

  if (result.rows.length !== categoryIds.length) {
    throw new HttpError(400, 'Some categories do not exist');
  }
}

async function ensureSingleCategoryExists(client, categoryId) {
  const result = await client.query('SELECT id FROM categories WHERE id = $1', [categoryId]);

  if (result.rows.length === 0) {
    throw new HttpError(400, 'Category does not exist');
  }
}

async function replaceQuizCategories(client, quizId, categoryIds) {
  await client.query('DELETE FROM quiz_categories WHERE quiz_id = $1', [quizId]);

  for (const categoryId of categoryIds) {
    await client.query(
      `
        INSERT INTO quiz_categories (quiz_id, category_id)
        VALUES ($1, $2)
      `,
      [quizId, categoryId]
    );
  }
}

async function ensureQuizIsMutable(client, quizId) {
  const result = await client.query(
    'SELECT EXISTS (SELECT 1 FROM game_sessions WHERE quiz_id = $1) AS has_sessions',
    [quizId]
  );

  if (result.rows[0].has_sessions) {
    throw new HttpError(409, 'Quiz can no longer be modified because it already has game sessions');
  }
}

async function syncQuizStatusBasedOnQuestions(client, quizId) {
  const questionsResult = await client.query(
    'SELECT COUNT(*)::int AS count FROM questions WHERE quiz_id = $1',
    [quizId]
  );

  const nextStatus = questionsResult.rows[0].count === 0 ? 'draft' : 'ready';

  await client.query(
    `
      UPDATE quizzes
      SET status = $2,
          updated_at = now()
      WHERE id = $1
        AND status <> 'archived'
    `,
    [quizId, nextStatus]
  );
}

function normalizeQuestionInput(input) {
  return {
    text: normalizeOptionalText(input.text),
    imageUrl: normalizeOptionalText(input.imageUrl),
    categoryId: normalizeNullableId(input.categoryId),
    type: input.type,
    points: input.points === undefined ? 100 : Number(input.points),
    options: normalizeQuestionOptions(input.options),
  };
}

function normalizeQuestionOptions(options) {
  if (!Array.isArray(options)) {
    return [];
  }

  return options.map((option) => ({
    text: normalizeNullableString(option.text),
    isCorrect: Boolean(option.isCorrect),
  }));
}

function validateQuestionInput(question) {
  if (!question.text && !question.imageUrl) {
    throw new HttpError(400, 'Question must contain text or imageUrl');
  }

  if (!['single', 'multiple'].includes(question.type)) {
    throw new HttpError(400, 'Question type must be single or multiple');
  }

  if (!Number.isInteger(question.points) || question.points < 1 || question.points > 10000) {
    throw new HttpError(400, 'Question points must be from 1 to 10000');
  }

  if (!Array.isArray(question.options) || question.options.length < 2) {
    throw new HttpError(400, 'Question must contain at least two answer options');
  }

  for (const option of question.options) {
    if (!option.text || option.text.length > 500) {
      throw new HttpError(400, 'Each answer option text must contain from 1 to 500 characters');
    }
  }

  const correctOptionsCount = question.options.filter((option) => option.isCorrect).length;

  if (question.type === 'single' && correctOptionsCount !== 1) {
    throw new HttpError(400, 'Question of type single must contain exactly one correct answer');
  }

  if (question.type === 'multiple' && correctOptionsCount < 1) {
    throw new HttpError(400, 'Question of type multiple must contain at least one correct answer');
  }
}

async function insertQuestionOptions(client, questionId, options) {
  for (let index = 0; index < options.length; index += 1) {
    const option = options[index];

    await client.query(
      `
        INSERT INTO answer_options (
          question_id,
          text,
          is_correct,
          position
        )
        VALUES ($1, $2, $3, $4)
      `,
      [questionId, option.text, option.isCorrect, index + 1]
    );
  }
}

async function loadOwnedQuestionForUpdate(client, questionId, ownerId) {
  const result = await client.query(
    `
      SELECT q.id, q.quiz_id
      FROM questions AS q
      JOIN quizzes AS quiz
        ON quiz.id = q.quiz_id
      WHERE q.id = $1
        AND quiz.owner_id = $2
      FOR UPDATE OF q, quiz
    `,
    [questionId, ownerId]
  );

  if (result.rows.length === 0) {
    throw new HttpError(404, 'Question not found');
  }

  return result.rows[0];
}

async function loadSingleQuestion(client, questionId) {
  const result = await client.query(
    `
      SELECT
        q.id,
        q.category_id,
        q.text,
        q.image_url,
        q.type,
        q.points,
        ao.id AS option_id,
        ao.text AS option_text,
        ao.is_correct,
        ao.position
      FROM questions AS q
      LEFT JOIN answer_options AS ao
        ON ao.question_id = q.id
      WHERE q.id = $1
      ORDER BY ao.position ASC, ao.id ASC
    `,
    [questionId]
  );

  if (result.rows.length === 0) {
    throw new HttpError(404, 'Question not found');
  }

  return {
    categoryId: result.rows[0].category_id,
    text: result.rows[0].text,
    imageUrl: result.rows[0].image_url,
    type: result.rows[0].type,
    points: result.rows[0].points,
    options: result.rows
      .filter((row) => row.option_id !== null)
      .map((row) => ({
        text: row.option_text,
        isCorrect: row.is_correct,
      })),
  };
}

async function rewriteQuestionOrder(client, quizId, questionIds) {
  await client.query(
    `
      UPDATE questions
      SET position = position + 1000000
      WHERE quiz_id = $1
    `,
    [quizId]
  );

  for (let index = 0; index < questionIds.length; index += 1) {
    await client.query(
      `
        UPDATE questions
        SET position = $3,
            updated_at = now()
        WHERE id = $1
          AND quiz_id = $2
      `,
      [questionIds[index], quizId, index + 1]
    );
  }
}

function mapQuizSummary(row) {
  return {
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    description: row.description,
    rules: row.rules,
    timePerQuestionSeconds: row.time_per_question_seconds,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    categories: row.categories || [],
    questionCount: row.question_count === undefined ? undefined : Number(row.question_count),
  };
}

function validateQuizInput({ title, timePerQuestionSeconds, categoryIds }) {
  if (!title || title.length > 200) {
    throw new HttpError(400, 'Quiz title must contain from 1 to 200 characters');
  }

  if (
    !Number.isInteger(timePerQuestionSeconds) ||
    timePerQuestionSeconds < 5 ||
    timePerQuestionSeconds > 300
  ) {
    throw new HttpError(400, 'timePerQuestionSeconds must be from 5 to 300');
  }

  if (!Array.isArray(categoryIds)) {
    throw new HttpError(400, 'categoryIds must be an array');
  }
}

function normalizeOptionalText(value) {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function normalizeNullableString(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

function normalizeIdArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized = value.map((item) => Number(item));

  if (!normalized.every(Number.isInteger)) {
    throw new HttpError(400, 'IDs must be integers');
  }

  const uniqueIds = [...new Set(normalized)];

  if (uniqueIds.length !== normalized.length) {
    throw new HttpError(400, 'IDs array must not contain duplicates');
  }

  return uniqueIds;
}

function normalizeNullableId(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const normalized = Number(value);

  if (!Number.isInteger(normalized)) {
    throw new HttpError(400, 'ID must be an integer');
  }

  return normalized;
}

function assertOrganizer(user) {
  if (!user || user.role !== 'organizer') {
    throw new HttpError(403, 'Only organizers can perform this action');
  }
}

module.exports = {
  listQuizzesForOrganizer,
  createQuiz,
  getQuizByIdForOwner,
  updateQuiz,
  deleteQuiz,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  reorderQuestions,
};
