const router = require('express').Router();
const ctrl = require('../controllers/review.controller');
const { authenticate } = require('../middlewares/auth');
const { createReviewRules } = require('../validators/review.validator');
const validate = require('../middlewares/validate');

router.post('/', authenticate, createReviewRules, validate, ctrl.createReview);
router.get('/user/:user_id', authenticate, ctrl.getUserReviews);
router.get('/summary/:user_id', authenticate, ctrl.getRatingSummary);

module.exports = router;
