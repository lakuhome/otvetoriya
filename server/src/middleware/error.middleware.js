function notFoundHandler(req, res) {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found',
    },
  });
}

function errorHandler(error, req, res, next) {
  const statusCode = error.statusCode || mapPostgresErrorToStatus(error) || 500;
  const message = mapErrorMessage(error);
  const code = mapErrorCode(error, statusCode);

  if (statusCode >= 500) {
    console.error(error);
  }

  res.status(statusCode).json({
    error: {
      code,
      message,
    },
  });
}

function mapPostgresErrorToStatus(error) {
  if (!error || !error.code) {
    return null;
  }

  if (error.code === '23505') {
    return 409;
  }

  return null;
}

function mapErrorCode(error, statusCode) {
  if (error && error.code && typeof error.code === 'string' && error.code !== '23505') {
    return error.code;
  }

  if (error && (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError')) {
    return 'UNAUTHORIZED';
  }

  if (error && error.code === '23505') {
    return 'CONFLICT';
  }

  if (statusCode === 400) {
    return 'VALIDATION_ERROR';
  }

  if (statusCode === 401) {
    return 'UNAUTHORIZED';
  }

  if (statusCode === 403) {
    return 'FORBIDDEN';
  }

  if (statusCode === 404) {
    return 'NOT_FOUND';
  }

  if (statusCode === 409) {
    return 'CONFLICT';
  }

  return 'INTERNAL_ERROR';
}

function mapErrorMessage(error) {
  if (!error) {
    return 'Unknown error';
  }

  return error.message || 'Unknown error';
}

module.exports = {
  notFoundHandler,
  errorHandler,
};
