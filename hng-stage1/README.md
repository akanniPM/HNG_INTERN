# HNG Stage 1 — Name Profile API

A REST API that accepts a first name, enriches it with gender, estimated age, and nationality data from three public APIs, and persists the result in a PostgreSQL database.

**Live Base URL:** `https://hngintern-production.up.railway.app`

---

## Table of Contents

- [How It Works](#how-it-works)
- [Endpoints](#endpoints)
- [Request & Response Examples](#request--response-examples)
- [Error Responses](#error-responses)
- [Filtering](#filtering)
- [Local Setup](#local-setup)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)

---

## How It Works

When you `POST` a name, the API simultaneously calls:
- **[Genderize.io](https://genderize.io)** — predicts gender + probability
- **[Agify.io](https://agify.io)** — predicts age
- **[Nationalize.io](https://nationalize.io)** — predicts nationality (top country by probability)

The results are classified (e.g. age → age group) and stored in PostgreSQL. Submitting the same name twice returns the stored record without creating a duplicate.

---

## Endpoints

| Method | Path | Description | Success Code |
|--------|------|-------------|--------------|
| `POST` | `/api/profiles` | Create a profile | `201` (new) / `200` (exists) |
| `GET` | `/api/profiles` | List all profiles | `200` |
| `GET` | `/api/profiles/:id` | Get a single profile | `200` |
| `DELETE` | `/api/profiles/:id` | Delete a profile | `204` |

---

## Request & Response Examples

### POST /api/profiles — Create a Profile

**Request**
```http
POST /api/profiles
Content-Type: application/json

{
  "name": "james"
}
```

**Response — 201 Created (new profile)**
```json
{
  "status": "success",
  "data": {
    "id": "019d9c76-11b0-750e-8591-6d7a4447ad1f",
    "name": "james",
    "gender": "male",
    "gender_probability": 0.98,
    "sample_size": 287954,
    "age": 47,
    "age_group": "adult",
    "country_id": "US",
    "country_probability": 0.094,
    "created_at": "2026-04-17T17:21:16.724Z"
  }
}
```

**Response — 200 OK (name already exists)**
```json
{
  "status": "success",
  "message": "Profile already exists",
  "data": { ... }
}
```

---

### GET /api/profiles — List All Profiles

**Request**
```http
GET /api/profiles
```

**Response — 200 OK**
```json
{
  "status": "success",
  "count": 2,
  "data": [
    {
      "id": "019d9c76-11b0-750e-8591-6d7a4447ad1f",
      "name": "james",
      "gender": "male",
      "gender_probability": 0.98,
      "sample_size": 287954,
      "age": 47,
      "age_group": "adult",
      "country_id": "US",
      "country_probability": 0.094,
      "created_at": "2026-04-17T17:21:16.724Z"
    }
  ]
}
```

---

### GET /api/profiles/:id — Get Single Profile

**Request**
```http
GET /api/profiles/019d9c76-11b0-750e-8591-6d7a4447ad1f
```

**Response — 200 OK**
```json
{
  "status": "success",
  "data": {
    "id": "019d9c76-11b0-750e-8591-6d7a4447ad1f",
    "name": "james",
    ...
  }
}
```

---

### DELETE /api/profiles/:id — Delete a Profile

**Request**
```http
DELETE /api/profiles/019d9c76-11b0-750e-8591-6d7a4447ad1f
```

**Response — 204 No Content**
```
(empty body)
```

---

## Error Responses

| Scenario | Status | Response |
|----------|--------|----------|
| Missing name field | `400` | `{ "status": "error", "message": "Name parameter is required" }` |
| Name is not a string | `422` | `{ "status": "error", "message": "Name must be a string" }` |
| Profile not found | `404` | `{ "status": "error", "message": "Profile not found" }` |
| External API failure | `502` | `{ "status": "error", "message": "..." }` |

---

## Filtering

The `GET /api/profiles` endpoint accepts optional query parameters. All values are **case-insensitive**.

| Parameter | Example | Description |
|-----------|---------|-------------|
| `gender` | `?gender=male` | Filter by gender |
| `country_id` | `?country_id=NG` | Filter by ISO country code |
| `age_group` | `?age_group=adult` | Filter by age group |

**Age groups:** `child` (0–12), `teenager` (13–19), `adult` (20–59), `senior` (60+)

Filters can be combined:
```
GET /api/profiles?gender=female&country_id=US&age_group=adult
```

---

## Local Setup

```bash
# 1. Clone the repo and navigate to the project
git clone https://github.com/akanniPM/HNG_INTERN.git
cd HNG_INTERN
git checkout stage-1
cd hng-stage1

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env and fill in your DATABASE_URL

# 4. Start the development server (auto-restarts on changes)
npm run dev

# 5. For production
npm start
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `PORT` | No | Server port (default: `3000`) |

Copy `.env.example` to `.env` and fill in your values. The database table is created automatically on first boot — no manual SQL required.

---

## Deployment

This API is deployed on [Railway](https://railway.app).

1. Push code to GitHub (`stage-1` branch)
2. In Railway: **New Service** → **GitHub Repo** → set branch to `stage-1`, root directory to `hng-stage1`
3. Add a **PostgreSQL** database plugin — Railway injects `DATABASE_URL` automatically
4. Deploy — on first boot you will see:
   ```
   Database table ready.
   Server running on port XXXX
   ```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js |
| Framework | Express 5 |
| Database | PostgreSQL (via `pg`) |
| HTTP client | Axios |
| ID generation | UUID v7 |
| Hosting | Railway |
