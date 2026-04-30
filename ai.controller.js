const db = require('../config/db');
const { success, error } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');
const aiService = require('../services/ai.service');

// Match campaigns for an event post
exports.matchCampaigns = asyncHandler(async (req, res) => {
  const { event_post_id } = req.body;

  const [eventRows] = await db.query(
    'SELECT * FROM posts WHERE id = ? AND post_type = "event" AND status = "active"',
    [event_post_id]
  );
  if (eventRows.length === 0) return error(res, 'Event post not found or inactive', 404);

  const eventPost = eventRows[0];
  const eventCaption = eventPost.caption || eventPost.title;

  // Get all active campaigns
  const [campaigns] = await db.query(
    'SELECT id, caption, title FROM posts WHERE post_type = "campaign" AND status = "active"'
  );
  if (campaigns.length === 0) return success(res, { matches: [] }, 'No active campaigns');

  const candidateList = campaigns.map(c => ({ id: c.id, caption: c.caption || c.title }));

  try {
    const matches = await aiService.matchCampaignsForEvent(eventCaption, candidateList);

    // Log the match
    await db.query(
      'INSERT INTO ai_match_logs (user_id, source_post_id, match_type, matched_ids, model_used) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, event_post_id, 'campaigns_for_event', JSON.stringify(matches), process.env.LM_STUDIO_MODEL]
    );

    return success(res, { matches });
  } catch (err) {
    console.error('AI matching error:', err.message);
    return error(res, 'AI matching service unavailable. Please try again later.', 503);
  }
});

// Match events for a campaign post
exports.matchEvents = asyncHandler(async (req, res) => {
  const { campaign_post_id } = req.body;

  const [campaignRows] = await db.query(
    'SELECT * FROM posts WHERE id = ? AND post_type = "campaign" AND status = "active"',
    [campaign_post_id]
  );
  if (campaignRows.length === 0) return error(res, 'Campaign post not found or inactive', 404);

  const campaign = campaignRows[0];
  const campaignCaption = campaign.caption || campaign.title;

  const [events] = await db.query(
    'SELECT id, caption, title FROM posts WHERE post_type = "event" AND status = "active"'
  );
  if (events.length === 0) return success(res, { matches: [] }, 'No active events');

  const candidateList = events.map(e => ({ id: e.id, caption: e.caption || e.title }));

  try {
    const matches = await aiService.matchEventsForCampaign(campaignCaption, candidateList);

    await db.query(
      'INSERT INTO ai_match_logs (user_id, source_post_id, match_type, matched_ids, model_used) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, campaign_post_id, 'events_for_campaign', JSON.stringify(matches), process.env.LM_STUDIO_MODEL]
    );

    return success(res, { matches });
  } catch (err) {
    console.error('AI matching error:', err.message);
    return error(res, 'AI matching service unavailable. Please try again later.', 503);
  }
});

// Analyze review flag for a user
exports.analyzeReviewFlag = asyncHandler(async (req, res) => {
  const { user_id } = req.params;

  const [reviews] = await db.query(
    'SELECT review_text FROM reviews WHERE target_id = ? AND review_text IS NOT NULL',
    [user_id]
  );

  const reviewTexts = reviews.map(r => r.review_text).filter(Boolean);

  try {
    const flag = await aiService.analyzeReviewFlag(reviewTexts);

    await db.query(
      'INSERT INTO ai_review_flags (target_id, flag, model_used) VALUES (?, ?, ?)',
      [user_id, flag, process.env.LM_STUDIO_MODEL]
    );

    return success(res, { user_id: parseInt(user_id), flag });
  } catch (err) {
    console.error('AI review analysis error:', err.message);
    return error(res, 'AI review analysis unavailable. Please try again later.', 503);
  }
});
