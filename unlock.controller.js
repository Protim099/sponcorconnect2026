const db = require('../config/db');
const { success, error } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

// Check unlock status
exports.checkUnlock = asyncHandler(async (req, res) => {
  const { target_id } = req.params;
  const [rows] = await db.query(
    'SELECT id FROM contact_unlocks WHERE requester_id = ? AND target_id = ?',
    [req.user.id, target_id]
  );
  return success(res, { unlocked: rows.length > 0 });
});

// Unlock contact (manual unlock if deal exists)
exports.unlockContact = asyncHandler(async (req, res) => {
  const { target_id } = req.body;

  // Check if there's an active/completed deal between users
  const [deals] = await db.query(
    `SELECT id FROM sponsorship_deals
     WHERE ((seeker_id = ? AND sponsor_id = ?) OR (seeker_id = ? AND sponsor_id = ?))
       AND status IN ('active', 'completed')`,
    [req.user.id, target_id, target_id, req.user.id]
  );
  if (deals.length === 0) return error(res, 'No valid deal exists to unlock contact', 403);

  await db.query(
    'INSERT IGNORE INTO contact_unlocks (requester_id, target_id, deal_id) VALUES (?, ?, ?)',
    [req.user.id, target_id, deals[0].id]
  );

  return success(res, null, 'Contact unlocked');
});

// Get profile with contact info (only if unlocked)
exports.getProfileWithContact = asyncHandler(async (req, res) => {
  const { user_id } = req.params;

  // Check unlock
  const [unlocks] = await db.query(
    'SELECT id FROM contact_unlocks WHERE requester_id = ? AND target_id = ?',
    [req.user.id, user_id]
  );
  const unlocked = unlocks.length > 0 || req.user.id === parseInt(user_id);

  let query;
  if (unlocked) {
    query = `SELECT u.id, u.role, up.display_name, up.bio, up.profile_image, up.logo,
                    up.website, up.phone, up.contact_email, up.company_name,
                    up.sponsorship_history, up.average_rating, up.review_count
             FROM users u LEFT JOIN user_profiles up ON u.id = up.user_id WHERE u.id = ?`;
  } else {
    // Hidden contact details
    query = `SELECT u.id, u.role, up.display_name, up.bio, up.profile_image, up.logo,
                    up.average_rating, up.review_count
             FROM users u LEFT JOIN user_profiles up ON u.id = up.user_id WHERE u.id = ?`;
  }

  const [rows] = await db.query(query, [user_id]);
  if (rows.length === 0) return error(res, 'User not found', 404);

  return success(res, { ...rows[0], contact_unlocked: unlocked });
});
