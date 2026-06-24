const { HttpError } = require('../utils/http-error');

function requireRole(...allowedRoles) {
  return function roleMiddleware(req, res, next) {
    if (!req.user) {
      return next(new HttpError(401, 'Authentication is required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new HttpError(403, 'Access denied'));
    }

    next();
  };
}

module.exports = {
  requireRole,
};

