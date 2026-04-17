# HNG Stage 1 — Name Profile API

Accepts a first name, enriches it with gender, age, and nationality data from three public APIs, persists the result in PostgreSQL, and exposes CRUD endpoints.

---

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/profiles` | Create a profile (idempotent by name) |
| `GET` | `/api/profiles` | List all profiles (filterable) |
| `GET` | `/api/profiles/:id` | Get a single profile by UUID |
| `DELETE` | `/api/profiles/:id` | Delete a profile (204 No Content) |

### Filters for GET /api/profiles
All filter values are case-insensitive.
```
/api/profiles?gender=male
/api/profiles?country_id=NG
/api/profiles?age_group=adult
/api/profiles?gender=female&country_id=US&age_group=adult
```

---

## Local Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy and fill in environment variables
cp .env.example .env

# 3. Start development server (auto-restarts on file changes)
npm run dev
```

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `PORT` | Server port (default: 3000) |

---

## Deployment (Railway)

1. Push this repo to GitHub
2. Create a new Railway project → **Deploy from GitHub repo**
3. Set **Root Directory** to `hng-stage1`
4. Add a **PostgreSQL** plugin inside Railway — it auto-sets `DATABASE_URL`
5. Deploy — the table is created automatically on first boot
