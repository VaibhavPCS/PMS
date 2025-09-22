const { validationResult } = require('express-validator');

module.exports = function validate(req, _res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const err = new Error('Validation failed');
  err.status = 400;
  err.details = result.array().map(({ msg, param, value, location }) => ({
    msg, param, value, location
  }));
  next(err);
};
