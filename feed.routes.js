const router = require('express').Router();
const ctrl = require('../controllers/post.controller');
const { authenticate } = require('../middlewares/auth');

// Seeker browses campaigns
router.get('/campaigns', authenticate, ctrl.getFeed('campaign'));
// Sponsor browses event posts
router.get('/events', authenticate, ctrl.getFeed('event'));

module.exports = router;
