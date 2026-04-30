const db = require('../config/db');
const { success, error } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

// Seeker applies to a sponsor campaign
exports.applyToCampaign = asyncHandler(async (req, res) => {
  const { post_id, message } = req.body;

  // Verify campaign exists and is active
  const [posts] = await db.query(
    'SELECT * FROM posts WHERE id = ? AND post_type = "campaign" AND status = "active"',
    [post_id]
  );
  if (posts.length === 0) return error(res, 'Campaign not found or inactive', 404);

  const campaign = posts[0];

  // Cannot apply to own campaign
  if (campaign.user_id === req.user.id) return error(res, 'Cannot apply to your own campaign', 400);

  // Check slots
  if (campaign.slot_count && campaign.slots_filled >= campaign.slot_count) {
    return error(res, 'No slots available', 400);
  }

  // Check duplicate
  const [existing] = await db.query(
    'SELECT id FROM applications WHERE post_id = ? AND applicant_id = ?',
    [post_id, req.user.id]
  );
  if (existing.length > 0) return error(res, 'Already applied', 409);

  const [result] = await db.query(
    'INSERT INTO applications (post_id, applicant_id, message) VALUES (?, ?, ?)',
    [post_id, req.user.id, message || null]
  );

  return success(res, { id: result.insertId }, 'Application submitted', 201);
});

// Get my applications (as seeker)
exports.getMyApplications = asyncHandler(async (req, res) => {
  const [rows] = await db.query(
    `SELECT a.*, p.title as campaign_title, p.cover_image
     FROM applications a
     JOIN posts p ON a.post_id = p.id
     WHERE a.applicant_id = ?
     ORDER BY a.created_at DESC`,
    [req.user.id]
  );
  return success(res, rows);
});

// Sponsor views applications for their campaign
exports.getCampaignApplications = asyncHandler(async (req, res) => {
  const { post_id } = req.params;

  // Verify ownership
  const [posts] = await db.query('SELECT * FROM posts WHERE id = ? AND user_id = ?', [post_id, req.user.id]);
  if (posts.length === 0) return error(res, 'Campaign not found or not yours', 404);

  const [rows] = await db.query(
    `SELECT a.*, up.display_name, up.profile_image, up.average_rating
     FROM applications a
     JOIN user_profiles up ON a.applicant_id = up.user_id
     WHERE a.post_id = ?
     ORDER BY a.created_at DESC`,
    [post_id]
  );
  return success(res, rows);
});

// Accept application (with transaction for slot management)
exports.acceptApplication = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const [apps] = await conn.query('SELECT * FROM applications WHERE id = ? FOR UPDATE', [id]);
    if (apps.length === 0) { await conn.rollback(); return error(res, 'Application not found', 404); }
    const app = apps[0];
    if (app.status !== 'pending') { await conn.rollback(); return error(res, 'Application is not pending', 400); }

    // Verify sponsor owns the campaign
    const [posts] = await conn.query('SELECT * FROM posts WHERE id = ? FOR UPDATE', [app.post_id]);
    if (posts.length === 0 || posts[0].user_id !== req.user.id) {
      await conn.rollback(); return error(res, 'Not authorized', 403);
    }

    const campaign = posts[0];
    if (campaign.slot_count && campaign.slots_filled >= campaign.slot_count) {
      await conn.rollback(); return error(res, 'No slots available', 400);
    }

    // Accept & increment slot
    await conn.query('UPDATE applications SET status = "accepted" WHERE id = ?', [id]);
    await conn.query('UPDATE posts SET slots_filled = slots_filled + 1 WHERE id = ?', [app.post_id]);

    // Create deal
    await conn.query(
      `INSERT INTO sponsorship_deals (seeker_id, sponsor_id, campaign_post_id, application_id)
       VALUES (?, ?, ?, ?)`,
      [app.applicant_id, req.user.id, app.post_id, id]
    );

    // Create unlock entries for both parties
    await conn.query(
      'INSERT IGNORE INTO contact_unlocks (requester_id, target_id) VALUES (?, ?), (?, ?)',
      [req.user.id, app.applicant_id, app.applicant_id, req.user.id]
    );

    await conn.commit();
    return success(res, null, 'Application accepted');
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

// Reject application
exports.rejectApplication = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [apps] = await db.query('SELECT * FROM applications WHERE id = ?', [id]);
  if (apps.length === 0) return error(res, 'Application not found', 404);

  const [posts] = await db.query('SELECT user_id FROM posts WHERE id = ?', [apps[0].post_id]);
  if (posts.length === 0 || posts[0].user_id !== req.user.id) return error(res, 'Not authorized', 403);

  if (apps[0].status !== 'pending') return error(res, 'Application is not pending', 400);

  await db.query('UPDATE applications SET status = "rejected" WHERE id = ?', [id]);
  return success(res, null, 'Application rejected');
});
