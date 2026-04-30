const router = require('express').Router();
const ctrl = require('../controllers/ai.controller');
const { authenticate } = require('../middlewares/auth');

router.post('/match-campaigns', authenticate, ctrl.matchCampaigns);
router.post('/match-events', authenticate, ctrl.matchEvents);
router.get('/review-flag/:user_id', authenticate, ctrl.analyzeReviewFlag);

module.exports = router;
