const db = require('../config/db');
const { success, error } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

// Create post (event or campaign)
exports.createPost = (postType) => asyncHandler(async (req, res) => {
  const { title, description, caption, category_id, location, event_date, budget_range, slot_count } = req.body;
  const cover_image = req.file ? req.file.filename : null;

  // Validate role matches post type
  if (postType === 'event' && req.user.role !== 'seeker') {
    return error(res, 'Only seekers can create event posts', 403);
  }
  if (postType === 'campaign' && req.user.role !== 'sponsor') {
    return error(res, 'Only sponsors can create campaign posts', 403);
  }

  const [result] = await db.query(
    `INSERT INTO posts (user_id, post_type, title, description, caption, category_id, location, event_date, budget_range, slot_count, cover_image)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [req.user.id, postType, title, description, caption || null, category_id || null,
     location || null, event_date || null, budget_range || null,
     postType === 'campaign' ? (slot_count || 1) : null, cover_image]
  );

  return success(res, { id: result.insertId }, 'Post created', 201);
});

// Update own post
exports.updatePost = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const [rows] = await db.query('SELECT * FROM posts WHERE id = ? AND user_id = ? AND status != "deleted"', [id, req.user.id]);
  if (rows.length === 0) return error(res, 'Post not found or not yours', 404);

  const { title, description, caption, category_id, location, event_date, budget_range, slot_count, status } = req.body;
  const cover_image = req.file ? req.file.filename : undefined;

  const fields = [];
  const values = [];
  const addField = (name, val) => { if (val !== undefined) { fields.push(`${name} = ?`); values.push(val); } };

  addField('title', title);
  addField('description', description);
  addField('caption', caption);
  addField('category_id', category_id);
  addField('location', location);
  addField('event_date', event_date);
  addField('budget_range', budget_range);
  addField('slot_count', slot_count);
  addField('status', status);
  if (cover_image) addField('cover_image', cover_image);

  if (fields.length === 0) return error(res, 'No fields to update', 400);

  values.push(id);
  await db.query(`UPDATE posts SET ${fields.join(', ')} WHERE id = ?`, values);
  return success(res, null, 'Post updated');
});

// Delete own post (soft delete)
exports.deletePost = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const [result] = await db.query(
    'UPDATE posts SET status = "deleted" WHERE id = ? AND user_id = ?',
    [id, req.user.id]
  );
  if (result.affectedRows === 0) return error(res, 'Post not found or not yours', 404);
  return success(res, null, 'Post deleted');
});

// Get own posts
exports.getMyPosts = (postType) => asyncHandler(async (req, res) => {
  const [rows] = await db.query(
    `SELECT p.*, c.name as category_name
     FROM posts p LEFT JOIN categories c ON p.category_id = c.id
     WHERE p.user_id = ? AND p.post_type = ? AND p.status != 'deleted'
     ORDER BY p.created_at DESC`,
    [req.user.id, postType]
  );
  return success(res, rows);
});

// Get single post detail
exports.getPostDetail = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const [rows] = await db.query(
    `SELECT p.*, c.name as category_name, up.display_name, up.profile_image, up.average_rating
     FROM posts p
     LEFT JOIN categories c ON p.category_id = c.id
     LEFT JOIN user_profiles up ON p.user_id = up.user_id
     WHERE p.id = ? AND p.status != 'deleted'`,
    [id]
  );
  if (rows.length === 0) return error(res, 'Post not found', 404);

  // Get additional images
  const [images] = await db.query('SELECT * FROM post_images WHERE post_id = ? ORDER BY sort_order', [id]);
  const post = rows[0];
  post.images = images;

  return success(res, post);
});

// Feed: browse posts of opposite type with search/filter/sort
exports.getFeed = (postType) => asyncHandler(async (req, res) => {
  const { search, category_id, sort } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  let where = 'p.post_type = ? AND p.status = "active"';
  const params = [postType];

  if (search) {
    where += ' AND MATCH(p.title, p.description, p.caption) AGAINST(? IN BOOLEAN MODE)';
    params.push(search);
  }
  if (category_id) {
    where += ' AND p.category_id = ?';
    params.push(category_id);
  }

  let orderBy = 'p.created_at DESC';
  if (sort === 'popularity') orderBy = 'p.popularity DESC, p.created_at DESC';

  const [rows] = await db.query(
    `SELECT p.*, c.name as category_name, up.display_name, up.profile_image
     FROM posts p
     LEFT JOIN categories c ON p.category_id = c.id
     LEFT JOIN user_profiles up ON p.user_id = up.user_id
     WHERE ${where}
     ORDER BY ${orderBy}
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const [[{ total }]] = await db.query(`SELECT COUNT(*) as total FROM posts p WHERE ${where}`, params);

  return success(res, { posts: rows, total, page, limit });
});
