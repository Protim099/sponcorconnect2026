const { error } = require('../utils/response');

const errorHandler = (err, req, res, next) => {
  console.error('Error:', err.message);
  if (err.name === 'MulterError') {
    return error(res, err.message, 400);
  }
  if (err.message && err.message.includes('Only image files')) {
    return error(res, err.message, 400);
  }
  return error(res, err.message || 'Internal server error', err.statusCode || 500);
};

module.exports = errorHandler;
