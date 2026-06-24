const { query } = require('../db/pool');
const { verifyAccessToken } = require('../utils/jwt');
const { HttpError } = require('../utils/http-error');

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith('Bearer ')) {
      throw new HttpError(401, 'Authorization token is required', 'UNAUTHORIZED');
    }

    const token = header.slice('Bearer '.length).trim();
    const payload = verifyAccessToken(token);

    const result = await query(
      `
        SELECT id, email, display_name, role, created_at, updated_at
        FROM users
        WHERE id = $1
      `,
      [payload.userId]
    );

    if (result.rows.length === 0) {
      throw new HttpError(401, 'User not found', 'UNAUTHORIZED');
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  requireAuth,
};
