const router = require('express').Router();
const ctrl = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth');
const { registerRules, loginRules } = require('../validators/auth.validator');
const validate = require('../middlewares/validate');
const upload = require('../config/multer');

router.post('/register', registerRules, validate, ctrl.register);
router.post('/login', loginRules, validate, ctrl.login);
router.get('/profile', authenticate, ctrl.getProfile);
router.put('/profile', authenticate, upload.single('profile_image'), ctrl.updateProfile);

module.exports = router;
