const { query } = require('../db/pool');
const { signAccessToken } = require('../utils/jwt');
const { HttpError } = require('../utils/http-error');

async function registerUser({ email, password, displayName, role }) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedDisplayName = normalizeDisplayName(displayName);

  validateRegisterInput({
    email: normalizedEmail,
    password,
    displayName: normalizedDisplayName,
    role,
  });

  let userId;

  try {
    const result = await query(
      'SELECT fn_register_user($1, $2, $3, $4) AS user_id',
      [normalizedEmail, password, normalizedDisplayName, role]
    );

    userId = result.rows[0].user_id;
  } catch (error) {
    throw mapDatabaseError(error);
  }

  const user = await getUserById(userId);
  const token = signAccessToken({
    userId: user.id,
    role: user.role,
  });

  return {
    user,
    token,
  };
}

async function loginUser({ email, password }) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    throw new HttpError(400, 'Email is required');
  }

  if (typeof password !== 'string' || password.length === 0) {
    throw new HttpError(400, 'Password is required', 'VALIDATION_ERROR');
  }

  const result = await query(
    `
      SELECT user_id, display_name, user_role
      FROM fn_authenticate_user($1, $2)
    `,
    [normalizedEmail, password]
  );

  if (result.rows.length === 0) {
    throw new HttpError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
  }

  const authUser = result.rows[0];
  const user = await getUserById(authUser.user_id);
  const token = signAccessToken({
    userId: user.id,
    role: user.role,
  });

  return {
    user,
    token,
  };
}

async function getUserById(userId) {
  const result = await query(
    `
      SELECT id, email, display_name, role, created_at, updated_at
      FROM users
      WHERE id = $1
    `,
    [userId]
  );

  if (result.rows.length === 0) {
    throw new HttpError(404, 'User not found', 'NOT_FOUND');
  }

  return result.rows[0];
}

function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

function normalizeDisplayName(displayName) {
  return typeof displayName === 'string' ? displayName.trim() : '';
}

function validateRegisterInput({ email, password, displayName, role }) {
  if (!email) {
    throw new HttpError(400, 'Email is required', 'VALIDATION_ERROR');
  }

  if (typeof password !== 'string' || password.length < 6) {
    throw new HttpError(400, 'Password must contain at least 6 characters', 'VALIDATION_ERROR');
  }

  if (displayName.length < 2 || displayName.length > 100) {
    throw new HttpError(400, 'Display name must contain from 2 to 100 characters', 'VALIDATION_ERROR');
  }

  if (!['organizer', 'participant'].includes(role)) {
    throw new HttpError(400, 'Role must be organizer or participant', 'VALIDATION_ERROR');
  }
}

function mapDatabaseError(error) {
  if (!error || !error.message) {
    return new HttpError(500, 'Database error');
  }

  if (error.message === 'Email already exists') {
    return new HttpError(409, error.message, 'USER_ALREADY_EXISTS');
  }

  if (
    error.message === 'Email is required' ||
    error.message === 'Password must contain at least 6 characters' ||
    error.message === 'Display name must contain from 2 to 100 characters' ||
    error.message === 'Invalid role'
  ) {
    return new HttpError(400, error.message, 'VALIDATION_ERROR');
  }

  return error;
}

module.exports = {
  registerUser,
  loginUser,
};
