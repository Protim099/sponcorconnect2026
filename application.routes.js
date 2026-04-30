const router = require('express').Router();
const ctrl = require('../controllers/application.controller');
const { authenticate, authorize } = require('../middlewares/auth');

router.post('/', authenticate, authorize('seeker'), ctrl.applyToCampaign);
router.get('/mine', authenticate, authorize('seeker'), ctrl.getMyApplications);
router.get('/campaign/:post_id', authenticate, authorize('sponsor'), ctrl.getCampaignApplications);
router.put('/:id/accept', authenticate, authorize('sponsor'), ctrl.acceptApplication);
router.put('/:id/reject', authenticate, authorize('sponsor'), ctrl.rejectApplication);

module.exports = router;
