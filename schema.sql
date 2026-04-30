CREATE DATABASE IF NOT EXISTS sponsorconnect CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE sponsorconnect;

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('seeker','sponsor','admin') NOT NULL DEFAULT 'seeker',
  status ENUM('active','banned') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_email (email),
  INDEX idx_users_role (role)
) ENGINE=InnoDB;

-- ============================================================
-- USER PROFILES
-- ============================================================
CREATE TABLE user_profiles (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL UNIQUE,
  display_name VARCHAR(150) DEFAULT NULL,
  bio TEXT DEFAULT NULL,
  profile_image VARCHAR(500) DEFAULT NULL,
  logo VARCHAR(500) DEFAULT NULL,
  website VARCHAR(500) DEFAULT NULL,
  phone VARCHAR(50) DEFAULT NULL,
  contact_email VARCHAR(255) DEFAULT NULL,
  company_name VARCHAR(255) DEFAULT NULL,
  sponsorship_history TEXT DEFAULT NULL,
  average_rating DECIMAL(3,2) DEFAULT 0.00,
  review_count INT UNSIGNED DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- CATEGORIES
-- ============================================================
CREATE TABLE categories (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(500) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Seed some default categories
INSERT INTO categories (name) VALUES
  ('Technology'),('Sports'),('Music'),('Education'),('Health'),
  ('Gaming'),('Food & Beverage'),('Fashion'),('Environment'),('Art');

-- ============================================================
-- POSTS (unified: event posts & campaign posts)
-- ============================================================
CREATE TABLE posts (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  post_type ENUM('event','campaign') NOT NULL,
  title VARCHAR(300) NOT NULL,
  description TEXT NOT NULL,
  caption VARCHAR(1000) DEFAULT NULL,        -- short summary used for AI matching
  category_id INT UNSIGNED DEFAULT NULL,
  location VARCHAR(255) DEFAULT NULL,
  event_date DATE DEFAULT NULL,              -- for event posts
  budget_range VARCHAR(100) DEFAULT NULL,    -- e.g. "$500 - $2000"
  slot_count INT UNSIGNED DEFAULT NULL,      -- for campaigns: total sponsorship slots
  slots_filled INT UNSIGNED DEFAULT 0,       -- for campaigns: how many accepted
  cover_image VARCHAR(500) DEFAULT NULL,
  status ENUM('active','inactive','deleted') NOT NULL DEFAULT 'active',
  popularity INT UNSIGNED DEFAULT 0,         -- simple counter for sorting
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  INDEX idx_posts_type_status (post_type, status),
  INDEX idx_posts_user (user_id),
  INDEX idx_posts_category (category_id),
  INDEX idx_posts_created (created_at DESC),
  FULLTEXT INDEX idx_posts_search (title, description, caption)
) ENGINE=InnoDB;

-- ============================================================
-- POST IMAGES (additional images)
-- ============================================================
CREATE TABLE post_images (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  post_id INT UNSIGNED NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  sort_order TINYINT UNSIGNED DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- APPLICATIONS (seeker applies to a sponsor campaign)
-- ============================================================
CREATE TABLE applications (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  post_id INT UNSIGNED NOT NULL,             -- the campaign post
  applicant_id INT UNSIGNED NOT NULL,        -- the seeker
  message TEXT DEFAULT NULL,
  status ENUM('pending','accepted','rejected') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (applicant_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uk_application (post_id, applicant_id),
  INDEX idx_app_status (status)
) ENGINE=InnoDB;

-- ============================================================
-- SPONSORSHIP OFFERS (sponsor offers to a seeker post)
-- ============================================================
CREATE TABLE sponsorship_offers (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  post_id INT UNSIGNED NOT NULL,             -- the seeker's event post
  sponsor_id INT UNSIGNED NOT NULL,          -- the sponsor user
  campaign_id INT UNSIGNED DEFAULT NULL,     -- optional: linked campaign
  message TEXT DEFAULT NULL,
  status ENUM('pending','accepted','rejected') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (sponsor_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (campaign_id) REFERENCES posts(id) ON DELETE SET NULL,
  UNIQUE KEY uk_offer (post_id, sponsor_id),
  INDEX idx_offer_status (status)
) ENGINE=InnoDB;

-- ============================================================
-- SPONSORSHIP DEALS (completed agreements)
-- ============================================================
CREATE TABLE sponsorship_deals (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  seeker_id INT UNSIGNED NOT NULL,
  sponsor_id INT UNSIGNED NOT NULL,
  event_post_id INT UNSIGNED DEFAULT NULL,
  campaign_post_id INT UNSIGNED DEFAULT NULL,
  application_id INT UNSIGNED DEFAULT NULL,
  offer_id INT UNSIGNED DEFAULT NULL,
  status ENUM('active','completed','cancelled') NOT NULL DEFAULT 'active',
  payment_placeholder VARCHAR(255) DEFAULT NULL,  -- future payment reference
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (seeker_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (sponsor_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (event_post_id) REFERENCES posts(id) ON DELETE SET NULL,
  FOREIGN KEY (campaign_post_id) REFERENCES posts(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================
-- CONTACT UNLOCKS
-- ============================================================
CREATE TABLE contact_unlocks (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  requester_id INT UNSIGNED NOT NULL,        -- who wants to see contact
  target_id INT UNSIGNED NOT NULL,           -- whose contact is revealed
  deal_id INT UNSIGNED DEFAULT NULL,         -- linked deal
  unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (target_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (deal_id) REFERENCES sponsorship_deals(id) ON DELETE SET NULL,
  UNIQUE KEY uk_unlock (requester_id, target_id)
) ENGINE=InnoDB;

-- ============================================================
-- REVIEWS
-- ============================================================
CREATE TABLE reviews (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reviewer_id INT UNSIGNED NOT NULL,
  target_id INT UNSIGNED NOT NULL,
  deal_id INT UNSIGNED NOT NULL,
  rating TINYINT UNSIGNED NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (target_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (deal_id) REFERENCES sponsorship_deals(id) ON DELETE CASCADE,
  UNIQUE KEY uk_review (reviewer_id, deal_id),
  INDEX idx_review_target (target_id)
) ENGINE=InnoDB;

-- ============================================================
-- AI MATCH LOGS
-- ============================================================
CREATE TABLE ai_match_logs (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  source_post_id INT UNSIGNED NOT NULL,
  match_type ENUM('campaigns_for_event','events_for_campaign') NOT NULL,
  matched_ids JSON DEFAULT NULL,
  model_used VARCHAR(200) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (source_post_id) REFERENCES posts(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- AI REVIEW FLAGS
-- ============================================================
CREATE TABLE ai_review_flags (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  target_id INT UNSIGNED NOT NULL,
  flag ENUM('green','red') NOT NULL,
  model_used VARCHAR(200) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (target_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_flag_target (target_id)
) ENGINE=InnoDB;

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(300) DEFAULT NULL,
  message TEXT DEFAULT NULL,
  reference_id INT UNSIGNED DEFAULT NULL,
  is_read TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_notif_user_read (user_id, is_read)
) ENGINE=InnoDB;

-- ============================================================
-- ADMIN ACTIONS LOG
-- ============================================================
CREATE TABLE admin_actions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  admin_id INT UNSIGNED NOT NULL,
  action_type VARCHAR(100) NOT NULL,
  target_type VARCHAR(50) DEFAULT NULL,
  target_id INT UNSIGNED DEFAULT NULL,
  details TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
