const db = require('../config/db');
const { success, error } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

// Create review
exports.createReview = asyncHandler(async (req, res) => {
  const { deal_id, target_id, rating, review_text } = req.body;

  // Verify deal exists and is completed
  const [deals] = await db.query(
    'SELECT * FROM sponsorship_deals WHERE id = ? AND status = "completed"',
    [deal_id]
  );
  if (deals.length === 0) return error(res, 'Deal not found or not completed', 404);

  const deal = deals[0];
  // Verify reviewer is part of the deal
  if (deal.seeker_id !== req.user.id && deal.sponsor_id !== req.user.id) {
    return error(res, 'You are not part of this deal', 403);
  }
  // Verify target is the other party
  if (target_id === req.user.id) return error(res, 'Cannot review yourself', 400);
  if (target_id !== deal.seeker_id && target_id !== deal.sponsor_id) {
    return error(res, 'Target user is not part of this deal', 400);
  }

  // Check duplicate
  const [existing] = await db.query(
    'SELECT id FROM reviews WHERE reviewer_id = ? AND deal_id = ?',
    [req.user.id, deal_id]
  );
  if (existing.length > 0) return error(res, 'Already reviewed for this deal', 409);

  await db.query(
    'INSERT INTO reviews (reviewer_id, target_id, deal_id, rating, review_text) VALUES (?, ?, ?, ?, ?)',
    [req.user.id, target_id, deal_id, rating, review_text || null]
  );

  // Update average rating
  const [[stats]] = await db.query(
    'SELECT AVG(rating) as avg_rating, COUNT(*) as cnt FROM reviews WHERE target_id = ?',
    [target_id]
  );
  await db.query(
    'UPDATE user_profiles SET average_rating = ?, review_count = ? WHERE user_id = ?',
    [parseFloat(stats.avg_rating).toFixed(2), stats.cnt, target_id]
  );

  return success(res, null, 'Review submitted', 201);
});

// Get reviews for a user
exports.getUserReviews = asyncHandler(async (req, res) => {
  const { user_id } = req.params;
  const [rows] = await db.query(
    `SELECT r.*, up.display_name as reviewer_name, up.profile_image as reviewer_image
     FROM reviews r
     JOIN user_profiles up ON r.reviewer_id = up.user_id
     WHERE r.target_id = ?
     ORDER BY r.created_at DESC`,
    [user_id]
  );
  return success(res, rows);
});

// Rating summary
exports.getRatingSummary = asyncHandler(async (req, res) => {
  const { user_id } = req.params;
  const [[summary]] = await db.query(
    'SELECT average_rating, review_count FROM user_profiles WHERE user_id = ?',
    [user_id]
  );
  if (!summary) return error(res, 'User not found', 404);
  return success(res, summary);
});
