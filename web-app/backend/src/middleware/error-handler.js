export function notFoundHandler(_req, res) {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'API endpoint not found',
    },
  });
}

export function errorHandler(err, _req, res, _next) {
  const isSqliteConstraint = err.code?.startsWith?.('SQLITE_CONSTRAINT');
  const status = isSqliteConstraint ? 409 : err.status ?? 500;

  res.status(status).json({
    error: {
      code: err.code ?? 'INTERNAL_ERROR',
      message: isSqliteConstraint ? err.message.replace(/^.*?: /, '') : err.message,
    },
  });
}
