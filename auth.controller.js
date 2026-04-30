const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { success, error } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

// Register
exports.register = asyncHandler(async (req, res) => {
  const { email, password, role } = req.body;

  const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
  if (existing.length > 0) return error(res, 'Email already registered', 409);

  const hash = await bcrypt.hash(password, 10);
  const [result] = await db.query(
    'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)',
    [email, hash, role]
  );

  // Create empty profile
  await db.query('INSERT INTO user_profiles (user_id) VALUES (?)', [result.insertId]);

  const token = jwt.sign(
    { id: result.insertId, email, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  return success(res, { token, user: { id: result.insertId, email, role } }, 'Registration successful', 201);
});

// Login
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
  if (rows.length === 0) return error(res, 'Invalid credentials', 401);

  const user = rows[0];
  if (user.status === 'banned') return error(res, 'Account is banned', 403);

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) return error(res, 'Invalid credentials', 401);

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  return success(res, { token, user: { id: user.id, email: user.email, role: user.role } });
});

// Get current user profile
exports.getProfile = asyncHandler(async (req, res) => {
  const [rows] = await db.query(
    `SELECT u.id, u.email, u.role, u.status, u.created_at,
            p.display_name, p.bio, p.profile_image, p.logo, p.website,
            p.phone, p.contact_email, p.company_name, p.sponsorship_history,
            p.average_rating, p.review_count
     FROM users u LEFT JOIN user_profiles p ON u.id = p.user_id
     WHERE u.id = ?`,
    [req.user.id]
  );
  if (rows.length === 0) return error(res, 'User not found', 404);
  return success(res, rows[0]);
});

// Update profile
exports.updateProfile = asyncHandler(async (req, res) => {
  const { display_name, bio, website, phone, contact_email, company_name, sponsorship_history } = req.body;
  const profileImage = req.file ? req.file.filename : undefined;

  const fields = [];
  const values = [];

  const addField = (name, value) => {
    if (value !== undefined) { fields.push(`${name} = ?`); values.push(value); }
  };

  addField('display_name', display_name);
  addField('bio', bio);
  addField('website', website);
  addField('phone', phone);
  addField('contact_email', contact_email);
  addField('company_name', company_name);
  addField('sponsorship_history', sponsorship_history);
  if (profileImage) addField('profile_image', profileImage);

  if (fields.length === 0) return error(res, 'No fields to update', 400);

  values.push(req.user.id);
  await db.query(`UPDATE user_profiles SET ${fields.join(', ')} WHERE user_id = ?`, values);

  return success(res, null, 'Profile updated');
});
