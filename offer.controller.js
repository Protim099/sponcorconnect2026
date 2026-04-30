const db = require('../config/db');
const { success, error } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

// Sponsor sends offer to a seeker's event post
exports.sendOffer = asyncHandler(async (req, res) => {
  const { post_id, campaign_id, message } = req.body;

  const [posts] = await db.query(
    'SELECT * FROM posts WHERE id = ? AND post_type = "event" AND status = "active"',
    [post_id]
  );
  if (posts.length === 0) return error(res, 'Event post not found or inactive', 404);
  if (posts[0].user_id === req.user.id) return error(res, 'Cannot offer to your own post', 400);

  const [existing] = await db.query(
    'SELECT id FROM sponsorship_offers WHERE post_id = ? AND sponsor_id = ?',
    [post_id, req.user.id]
  );
  if (existing.length > 0) return error(res, 'Already sent an offer', 409);

  const [result] = await db.query(
    'INSERT INTO sponsorship_offers (post_id, sponsor_id, campaign_id, message) VALUES (?, ?, ?, ?)',
    [post_id, req.user.id, campaign_id || null, message || null]
  );

  return success(res, { id: result.insertId }, 'Offer sent', 201);
});

// Seeker views incoming offers
exports.getMyOffers = asyncHandler(async (req, res) => {
  const [rows] = await db.query(
    `SELECT o.*, p.title as event_title, up.display_name as sponsor_name, up.profile_image as sponsor_image
     FROM sponsorship_offers o
     JOIN posts p ON o.post_id = p.id
     JOIN user_profiles up ON o.sponsor_id = up.user_id
     WHERE p.user_id = ?
     ORDER BY o.created_at DESC`,
    [req.user.id]
  );
  return success(res, rows);
});

// Seeker accepts offer
exports.acceptOffer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const [offers] = await conn.query('SELECT * FROM sponsorship_offers WHERE id = ? FOR UPDATE', [id]);
    if (offers.length === 0) { await conn.rollback(); return error(res, 'Offer not found', 404); }
    const offer = offers[0];

    // Verify seeker owns the event post
    const [posts] = await conn.query('SELECT user_id FROM posts WHERE id = ?', [offer.post_id]);
    if (posts[0].user_id !== req.user.id) { await conn.rollback(); return error(res, 'Not authorized', 403); }
    if (offer.status !== 'pending') { await conn.rollback(); return error(res, 'Offer is not pending', 400); }

    await conn.query('UPDATE sponsorship_offers SET status = "accepted" WHERE id = ?', [id]);

    // Create deal
    await conn.query(
      `INSERT INTO sponsorship_deals (seeker_id, sponsor_id, event_post_id, campaign_post_id, offer_id)
       VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, offer.sponsor_id, offer.post_id, offer.campaign_id, id]
    );

    // Create unlock entries
    await conn.query(
      'INSERT IGNORE INTO contact_unlocks (requester_id, target_id) VALUES (?, ?), (?, ?)',
      [req.user.id, offer.sponsor_id, offer.sponsor_id, req.user.id]
    );

    await conn.commit();
    return success(res, null, 'Offer accepted');
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

// Seeker rejects offer
exports.rejectOffer = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [offers] = await db.query('SELECT * FROM sponsorship_offers WHERE id = ?', [id]);
  if (offers.length === 0) return error(res, 'Offer not found', 404);

  const [posts] = await db.query('SELECT user_id FROM posts WHERE id = ?', [offers[0].post_id]);
  if (posts[0].user_id !== req.user.id) return error(res, 'Not authorized', 403);
  if (offers[0].status !== 'pending') return error(res, 'Offer is not pending', 400);

  await db.query('UPDATE sponsorship_offers SET status = "rejected" WHERE id = ?', [id]);
  return success(res, null, 'Offer rejected');
});
