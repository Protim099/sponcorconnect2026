const router = require('express').Router();
const ctrl = require('../controllers/post.controller');
const { authenticate, authorize } = require('../middlewares/auth');
const { createPostRules, updatePostRules } = require('../validators/post.validator');
const validate = require('../middlewares/validate');
const upload = require('../config/multer');

// ---- Event posts (seekers) ----
router.post('/events', authenticate, authorize('seeker'), upload.single('cover_image'), createPostRules, validate, ctrl.createPost('event'));
router.get('/events/mine', authenticate, authorize('seeker'), ctrl.getMyPosts('event'));
router.get('/events/:id', authenticate, ctrl.getPostDetail);
router.put('/events/:id', authenticate, authorize('seeker'), upload.single('cover_image'), updatePostRules, validate, ctrl.updatePost);
router.delete('/events/:id', authenticate, authorize('seeker'), ctrl.deletePost);

// ---- Campaign posts (sponsors) ----
router.post('/campaigns', authenticate, authorize('sponsor'), upload.single('cover_image'), createPostRules, validate, ctrl.createPost('campaign'));
router.get('/campaigns/mine', authenticate, authorize('sponsor'), ctrl.getMyPosts('campaign'));
router.get('/campaigns/:id', authenticate, ctrl.getPostDetail);
router.put('/campaigns/:id', authenticate, authorize('sponsor'), upload.single('cover_image'), updatePostRules, validate, ctrl.updatePost);
router.delete('/campaigns/:id', authenticate, authorize('sponsor'), ctrl.deletePost);

module.exports = router;
