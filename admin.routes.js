const router = require('express').Router();
const ctrl = require('../controllers/admin.controller');
const { authenticate, authorize } = require('../middlewares/auth');

router.get('/users', authenticate, authorize('admin'), ctrl.listUsers);
router.put('/users/:id/ban', authenticate, authorize('admin'), ctrl.banUser);
router.put('/users/:id/unban', authenticate, authorize('admin'), ctrl.unbanUser);
router.put('/posts/:id/moderate', authenticate, authorize('admin'), ctrl.moderatePost);
router.get('/dashboard', authenticate, authorize('admin'), ctrl.getDashboardSummary);

module.exports = router;
