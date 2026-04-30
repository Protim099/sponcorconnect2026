const { body } = require('express-validator');

const createReviewRules = [
  body('deal_id').isInt({ min: 1 }),
  body('target_id').isInt({ min: 1 }),
  body('rating').isInt({ min: 1, max: 5 }),
  body('review_text').optional().trim().isLength({ max: 2000 }),
];

module.exports = { createReviewRules };
