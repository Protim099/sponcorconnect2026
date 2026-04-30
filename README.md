# SponsorConnect Backend

AI-assisted sponsorship matching platform — REST API backend.

## Architecture

```
src/
├── config/         # Database pool, multer setup
├── controllers/    # Request handlers
├── middlewares/     # Auth, validation, error handling
├── prompts/        # AI prompt templates
├── routes/         # Express route definitions
├── services/       # AI service layer (LM Studio)
├── utils/          # Response helpers, async handler
├── validators/     # express-validator rules
├── app.js          # Express app setup
└── server.js       # Entry point
```

### Design Decision: Unified Posts Table

Event posts and campaign posts share a single `posts` table with a `post_type` enum (`event` | `campaign`). This simplifies:
- Feed queries (one table, one index)
- Search with MySQL FULLTEXT
- AI matching (query both types from one table)
- Code reuse (shared CRUD controller)

Type-specific fields (e.g., `slot_count` for campaigns, `event_date` for events) are nullable columns.

## Setup

### Prerequisites
- Node.js 18+
- MySQL 8.0+
- LM Studio running locally with an OpenAI-compatible model loaded

### Installation

```bash
git clone <repo-url>
cd sponsorconnect-backend
npm install
```

### Database Setup

```bash
mysql -u root -p < schema.sql
```

### Environment Variables

Copy `.env.example` to `.env` and fill in:

```env
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_NAME=sponsorconnect
DB_USER=root
DB_PASSWORD=your_password
JWT_SECRET=change_this_to_a_long_random_string
JWT_EXPIRES_IN=7d
LM_STUDIO_BASE_URL=http://localhost:1234/v1
LM_STUDIO_MODEL=your-loaded-model-name
UPLOAD_DIR=uploads
```

### Connect LM Studio

1. Open LM Studio and load a model (e.g., Llama 3, Mistral, etc.)
2. Start the local server in LM Studio (default: `http://localhost:1234`)
3. Set `LM_STUDIO_BASE_URL` and `LM_STUDIO_MODEL` in `.env`
4. The backend calls `POST {LM_STUDIO_BASE_URL}/chat/completions`

### Run

```bash
# Development
npm run dev

# Production
npm start
```

Server starts at `http://localhost:5000`.

## API Overview

| Group | Base Path | Description |
|-------|-----------|-------------|
| Auth | `/api/auth` | Register, login, profile |
| Posts | `/api/posts` | CRUD for events & campaigns |
| Feed | `/api/feed` | Browse & search posts |
| Applications | `/api/applications` | Seeker applies to campaigns |
| Offers | `/api/offers` | Sponsor offers to seekers |
| AI | `/api/ai` | Matching & review analysis |
| Unlock | `/api/unlock` | Contact visibility control |
| Reviews | `/api/reviews` | Post-deal reviews |
| Admin | `/api/admin` | User/post moderation |

See `api-docs.md` for full endpoint documentation.

## Key Business Rules

- Sponsors define `slot_count`; accepted applications cannot exceed it
- Users can only edit/delete their own posts
- Cannot apply to own campaigns or offer to own events
- Reviews only after a completed deal
- Contact info hidden until unlock (accepted application/offer)
- AI matching only considers active posts
- AI review flag returns only "green" or "red"

## Default Admin

To create an admin user, register normally then update the role:

```sql
UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';
```
