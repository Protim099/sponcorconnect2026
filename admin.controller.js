const db = require('../config/db');
const { success, error } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

// List all users
exports.listUsers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  const [rows] = await db.query(
    `SELECT u.id, u.email, u.role, u.status, u.created_at,
            up.display_name, up.company_name
     FROM users u LEFT JOIN user_profiles up ON u.id = up.user_id
     ORDER BY u.created_at DESC LIMIT ? OFFSET ?`,
    [limit, offset]
  );
  const [[{ total }]] = await db.query('SELECT COUNT(*) as total FROM users');
  return success(res, { users: rows, total, page, limit });
});

// Ban user
exports.banUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await db.query('UPDATE users SET status = "banned" WHERE id = ? AND role != "admin"', [id]);
  await db.query(
    'INSERT INTO admin_actions (admin_id, action_type, target_type, target_id) VALUES (?, ?, ?, ?)',
    [req.user.id, 'ban_user', 'user', id]
  );
  return success(res, null, 'User banned');
});

// Unban user
exports.unbanUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await db.query('UPDATE users SET status = "active" WHERE id = ?', [id]);
  await db.query(
    'INSERT INTO admin_actions (admin_id, action_type, target_type, target_id) VALUES (?, ?, ?, ?)',
    [req.user.id, 'unban_user', 'user', id]
  );
  return success(res, null, 'User unbanned');
});

// Moderate post (activate/deactivate)
exports.moderatePost = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'active' or 'inactive'
  if (!['active', 'inactive'].includes(status)) return error(res, 'Status must be active or inactive', 400);

  await db.query('UPDATE posts SET status = ? WHERE id = ?', [status, id]);
  await db.query(
    'INSERT INTO admin_actions (admin_id, action_type, target_type, target_id, details) VALUES (?, ?, ?, ?, ?)',
    [req.user.id, 'moderate_post', 'post', id, JSON.stringify({ status })]
  );
  return success(res, null, `Post ${status === 'active' ? 'activated' : 'deactivated'}`);
});

// Dashboard summary
exports.getDashboardSummary = asyncHandler(async (req, res) => {
  const [[users]] = await db.query('SELECT COUNT(*) as total FROM users');
  const [[seekers]] = await db.query('SELECT COUNT(*) as total FROM users WHERE role = "seeker"');
  const [[sponsors]] = await db.query('SELECT COUNT(*) as total FROM users WHERE role = "sponsor"');
  const [[events]] = await db.query('SELECT COUNT(*) as total FROM posts WHERE post_type = "event" AND status = "active"');
  const [[campaigns]] = await db.query('SELECT COUNT(*) as total FROM posts WHERE post_type = "campaign" AND status = "active"');
  const [[deals]] = await db.query('SELECT COUNT(*) as total FROM sponsorship_deals');
  const [[reviews]] = await db.query('SELECT COUNT(*) as total FROM reviews');

  return success(res, {
    total_users: users.total,
    total_seekers: seekers.total,
    total_sponsors: sponsors.total,
    active_events: events.total,
    active_campaigns: campaigns.total,
    total_deals: deals.total,
    total_reviews: reviews.total,
  });
});
