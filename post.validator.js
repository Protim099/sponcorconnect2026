const { body } = require('express-validator');

const createPostRules = [
  body('title').trim().notEmpty().isLength({ max: 300 }),
  body('description').trim().notEmpty(),
  body('caption').optional().trim().isLength({ max: 1000 }),
  body('category_id').optional().isInt({ min: 1 }),
  body('location').optional().trim(),
  body('event_date').optional().isISO8601(),
  body('budget_range').optional().trim(),
  body('slot_count').optional().isInt({ min: 1 }),
];

const updatePostRules = [
  body('title').optional().trim().isLength({ max: 300 }),
  body('description').optional().trim(),
  body('caption').optional().trim().isLength({ max: 1000 }),
  body('category_id').optional().isInt({ min: 1 }),
  body('location').optional().trim(),
  body('event_date').optional().isISO8601(),
  body('budget_range').optional().trim(),
  body('slot_count').optional().isInt({ min: 1 }),
];

module.exports = { createPostRules, updatePostRules };
