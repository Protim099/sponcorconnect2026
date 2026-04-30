# SponsorConnect API Documentation

Base URL: `http://localhost:5000/api`

All authenticated endpoints require: `Authorization: Bearer <token>`

Response format:
```json
{ "success": true, "message": "...", "data": { ... } }
```

Error format:
```json
{ "success": false, "message": "...", "errors": [...] }
```

---

## 1. Auth APIs

### POST /auth/register
Register a new user.

**Body:**
```json
{ "email": "user@example.com", "password": "secret123", "role": "seeker" }
```
- `role`: `seeker` | `sponsor`

**Success (201):**
```json
{ "success": true, "message": "Registration successful", "data": { "token": "jwt...", "user": { "id": 1, "email": "user@example.com", "role": "seeker" } } }
```

**Error (409):**
```json
{ "success": false, "message": "Email already registered" }
```

### POST /auth/login
**Body:**
```json
{ "email": "user@example.com", "password": "secret123" }
```

**Success (200):**
```json
{ "success": true, "data": { "token": "jwt...", "user": { "id": 1, "email": "user@example.com", "role": "seeker" } } }
```

### GET /auth/profile
**Auth:** Required

**Success (200):** Returns full user profile with ratings.

### PUT /auth/profile
**Auth:** Required  
**Content-Type:** `multipart/form-data`

**Body (form fields):**
- `display_name`, `bio`, `website`, `phone`, `contact_email`, `company_name`, `sponsorship_history`
- `profile_image` (file)

---

## 2. Seeker Post APIs

### POST /posts/events
**Auth:** Seeker only  
**Content-Type:** `multipart/form-data`

**Body:**
- `title` (required), `description` (required), `caption`, `category_id`, `location`, `event_date`, `budget_range`
- `cover_image` (file)

**Success (201):**
```json
{ "success": true, "data": { "id": 5 } }
```

### GET /posts/events/mine
**Auth:** Seeker only — returns own event posts.

### GET /posts/events/:id
**Auth:** Required — returns post detail with images.

### PUT /posts/events/:id
**Auth:** Seeker only (own posts). Same body as create (all optional).

### DELETE /posts/events/:id
**Auth:** Seeker only (own posts). Soft-deletes.

---

## 3. Sponsor Campaign APIs

### POST /posts/campaigns
**Auth:** Sponsor only  
**Body:** Same as events + `slot_count` (int, default 1).

### GET /posts/campaigns/mine
**Auth:** Sponsor only.

### GET /posts/campaigns/:id
**Auth:** Required.

### PUT /posts/campaigns/:id
**Auth:** Sponsor only (own).

### DELETE /posts/campaigns/:id
**Auth:** Sponsor only (own).

---

## 4. Feed / Search APIs

### GET /feed/campaigns
**Auth:** Required  
Browse active sponsor campaigns.

**Query params:**
- `search` — keyword search (FULLTEXT)
- `category_id` — filter by category
- `sort` — `newest` (default) | `popularity`
- `page`, `limit` — pagination (default: page=1, limit=20)

**Success:**
```json
{ "success": true, "data": { "posts": [...], "total": 42, "page": 1, "limit": 20 } }
```

### GET /feed/events
**Auth:** Required  
Browse active seeker event posts. Same query params.

---

## 5. Application APIs

### POST /applications
**Auth:** Seeker only

**Body:**
```json
{ "post_id": 10, "message": "I'd love to partner!" }
```

**Errors:** 404 (not found), 400 (own campaign/no slots), 409 (duplicate)

### GET /applications/mine
**Auth:** Seeker only — list own applications with status.

### GET /applications/campaign/:post_id
**Auth:** Sponsor only — view applications for own campaign.

### PUT /applications/:id/accept
**Auth:** Sponsor only. Uses transaction: increments slots_filled, creates deal, creates contact unlocks.

### PUT /applications/:id/reject
**Auth:** Sponsor only.

---

## 6. Offer APIs

### POST /offers
**Auth:** Sponsor only

**Body:**
```json
{ "post_id": 5, "campaign_id": 10, "message": "We'd like to sponsor your event" }
```

### GET /offers/mine
**Auth:** Seeker only — view incoming offers.

### PUT /offers/:id/accept
**Auth:** Seeker only. Creates deal and contact unlocks.

### PUT /offers/:id/reject
**Auth:** Seeker only.

---

## 7. AI APIs

### POST /ai/match-campaigns
**Auth:** Required

**Body:**
```json
{ "event_post_id": 5 }
```

**Success:**
```json
{ "success": true, "data": { "matches": [{ "id": 12, "score": 92 }, { "id": 7, "score": 68 }] } }
```

**Error (503):** AI service unavailable.

### POST /ai/match-events
**Auth:** Required

**Body:**
```json
{ "campaign_post_id": 10 }
```

### GET /ai/review-flag/:user_id
**Auth:** Required

**Success:**
```json
{ "success": true, "data": { "user_id": 3, "flag": "green" } }
```

---

## 8. Unlock APIs

### GET /unlock/check/:target_id
**Auth:** Required

**Success:**
```json
{ "success": true, "data": { "unlocked": false } }
```

### POST /unlock
**Auth:** Required

**Body:**
```json
{ "target_id": 3 }
```

Requires an active/completed deal between users.

### GET /unlock/profile/:user_id
**Auth:** Required  
Returns full profile if unlocked, limited profile if not.

**Success (unlocked):**
```json
{ "success": true, "data": { "id": 3, "display_name": "...", "phone": "...", "contact_email": "...", "contact_unlocked": true } }
```

**Success (locked):**
```json
{ "success": true, "data": { "id": 3, "display_name": "...", "bio": "...", "contact_unlocked": false } }
```

---

## 9. Review APIs

### POST /reviews
**Auth:** Required

**Body:**
```json
{ "deal_id": 1, "target_id": 3, "rating": 5, "review_text": "Great sponsor!" }
```

Constraints: deal must be completed, reviewer must be part of deal, cannot review self, one review per deal.

### GET /reviews/user/:user_id
**Auth:** Required — get all reviews for a user.

### GET /reviews/summary/:user_id
**Auth:** Required

**Success:**
```json
{ "success": true, "data": { "average_rating": "4.50", "review_count": 8 } }
```

---

## 10. Admin APIs

### GET /admin/users
**Auth:** Admin only  
**Query:** `page`, `limit`

### PUT /admin/users/:id/ban
**Auth:** Admin only

### PUT /admin/users/:id/unban
**Auth:** Admin only

### PUT /admin/posts/:id/moderate
**Auth:** Admin only  
**Body:**
```json
{ "status": "inactive" }
```

### GET /admin/dashboard
**Auth:** Admin only

**Success:**
```json
{
  "success": true,
  "data": {
    "total_users": 150,
    "total_seekers": 90,
    "total_sponsors": 58,
    "active_events": 45,
    "active_campaigns": 32,
    "total_deals": 28,
    "total_reviews": 64
  }
}
```

---

## Health Check

### GET /health
No auth required.
```json
{ "status": "ok", "timestamp": "2026-03-29T..." }
```
