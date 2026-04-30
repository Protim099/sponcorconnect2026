const router = require('express').Router();
const ctrl = require('../controllers/unlock.controller');
const { authenticate } = require('../middlewares/auth');

router.get('/check/:target_id', authenticate, ctrl.checkUnlock);
router.post('/', authenticate, ctrl.unlockContact);
router.get('/profile/:user_id', authenticate, ctrl.getProfileWithContact);

module.exports = router;
