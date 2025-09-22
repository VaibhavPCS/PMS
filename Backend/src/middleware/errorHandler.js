module.exports = (err, req, res, _next) => {
  const code = err.status || err.statusCode || 500;
  const isProd = process.env.NODE_ENV === 'production';

  const payload = {
    ok: false,
    error: err.name || 'Error',
    code,
    message: err.publicMessage || err.message || 'Unexpected error',
  };

  if (!isProd && err.stack) payload.stack = err.stack;
  if (err.details) payload.details = err.details;

  res.status(code).json(payload);
};
