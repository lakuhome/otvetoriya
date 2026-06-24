class HttpError extends Error {
  constructor(statusCode, message, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code || defaultCodeByStatus(statusCode);
  }
}

function defaultCodeByStatus(statusCode) {
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

module.exports = { HttpError };
