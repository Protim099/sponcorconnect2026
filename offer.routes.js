const router = require('express').Router();
const ctrl = require('../controllers/offer.controller');
const { authenticate, authorize } = require('../middlewares/auth');

router.post('/', authenticate, authorize('sponsor'), ctrl.sendOffer);
router.get('/mine', authenticate, authorize('seeker'), ctrl.getMyOffers);
router.put('/:id/accept', authenticate, authorize('seeker'), ctrl.acceptOffer);
router.put('/:id/reject', authenticate, authorize('seeker'), ctrl.rejectOffer);

module.exports = router;
