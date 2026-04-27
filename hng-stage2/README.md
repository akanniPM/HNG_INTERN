# Insighta Labs – Intelligence Query Engine (HNG Stage 2)

A demographic profile database API with advanced filtering, sorting, pagination, and natural language search.

---

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy and fill in your environment variables
cp .env.example .env

# 3. Run database migration (creates the profiles table + indexes)
npm run migrate

# 4. Place the seed file at data/profiles.json, then run:
npm run seed

# 5. Start the server
npm start
# or for development with auto-reload:
npm run dev
```

**Environment variables** (`.env`):
```
DATABASE_URL=postgres://user:password@host:5432/dbname
NODE_ENV=production
PORT=3000
```

---

## Endpoints

### `GET /api/profiles`

Returns profiles with optional filtering, sorting, and pagination.

**Query parameters:**

| Parameter | Type | Description |
|---|---|---|
| `gender` | string | `male` or `female` |
| `age_group` | string | `child`, `teenager`, `adult`, or `senior` |
| `country_id` | string | ISO 2-letter code (e.g. `NG`) |
| `min_age` | integer | Minimum age (inclusive) |
| `max_age` | integer | Maximum age (inclusive) |
| `min_gender_probability` | float | Minimum gender confidence (0–1) |
| `min_country_probability` | float | Minimum country confidence (0–1) |
| `sort_by` | string | `age`, `created_at`, or `gender_probability` |
| `order` | string | `asc` or `desc` (default: `asc`) |
| `page` | integer | Page number (default: 1) |
| `limit` | integer | Results per page (default: 10, max: 50) |

**Example:**
```
GET /api/profiles?gender=male&country_id=NG&min_age=25&sort_by=age&order=desc&page=1&limit=10
```

**Success response (200):**
```json
{
  "status": "success",
  "page": 1,
  "limit": 10,
  "total": 312,
  "data": [
    {
      "id": "019634ab-...",
      "name": "emmanuel",
      "gender": "male",
      "gender_probability": 0.99,
      "age": 34,
      "age_group": "adult",
      "country_id": "NG",
      "country_name": "Nigeria",
      "country_probability": 0.85,
      "created_at": "2026-04-01T12:00:00.000Z"
    }
  ]
}
```

---

### `GET /api/profiles/search`

Accepts a plain English query and converts it to filters.

**Query parameters:**

| Parameter | Description |
|---|---|
| `q` | Natural language search string (required) |
| `page` | Page number (default: 1) |
| `limit` | Results per page (default: 10, max: 50) |

**Example:**
```
GET /api/profiles/search?q=young males from nigeria&page=1&limit=10
```

---

## Natural Language Parsing Approach

The `/api/profiles/search` endpoint uses **rule-based regex pattern matching** — no AI or LLMs are involved.

### How it works

1. The query string `q` is lowercased and trimmed.
2. Each regex rule runs sequentially against the string.
3. Each matched rule adds one or more filter fields to a `filters` object.
4. The resulting filters are applied to the database query exactly as they would be in `/api/profiles`.
5. If **no rules match**, the API returns `"Unable to interpret query"`.

### Supported keywords and their filter mappings

**Gender:**

| Keyword(s) | Filter applied |
|---|---|
| `male`, `males`, `man`, `men` | `gender = male` |
| `female`, `females`, `woman`, `women` | `gender = female` |
| Both male AND female in same query | No gender filter (all genders) |

**Age groups:**

| Keyword(s) | Filter applied |
|---|---|
| `child`, `children` | `age_group = child` |
| `teenager`, `teenagers`, `teen`, `teens`, `teenage` | `age_group = teenager` |
| `adult`, `adults` | `age_group = adult` |
| `senior`, `seniors`, `elderly` | `age_group = senior` |

**Special age mapping:**

| Keyword | Filter applied | Note |
|---|---|---|
| `young` | `min_age = 16, max_age = 24` | Only applies if no other age_group keyword is present |

**Age range:**

| Pattern | Filter applied |
|---|---|
| `above N`, `over N`, `older than N` | `min_age = N` |
| `below N`, `under N`, `younger than N` | `max_age = N` |

**Country (using `from` or `in` preposition):**

| Pattern | Filter applied |
|---|---|
| `from nigeria` | `country_id = NG` |
| `in kenya` | `country_id = KE` |
| `from south africa` | `country_id = ZA` |

Full list of supported country names is in `src/utils/countries.js`. Coverage includes all 54 African countries plus common world countries.

### Example query mappings

| Query | Filters applied |
|---|---|
| `young males` | `gender=male, min_age=16, max_age=24` |
| `females above 30` | `gender=female, min_age=30` |
| `people from angola` | `country_id=AO` |
| `adult males from kenya` | `gender=male, age_group=adult, country_id=KE` |
| `male and female teenagers above 17` | `age_group=teenager, min_age=17` |
| `elderly women from ghana` | `gender=female, age_group=senior, country_id=GH` |

---

## Limitations

1. **No typo tolerance.** Misspellings (e.g. `nigerria`, `feamle`) are not recognized.
2. **No negation support.** Queries like "not from Nigeria" or "non-adults" are not handled.
3. **`young` conflicts with explicit age ranges.** If both `young` and `above N` appear together, `young`'s `max_age=24` may conflict with the explicit `min_age`. The explicit value takes precedence for `min_age`, but `max_age=24` from `young` remains, potentially yielding empty results.
4. **Country detection requires `from` or `in` preposition.** "Nigerian males" is not parsed — write "males from Nigeria" instead.
5. **No word-number support.** Numbers must be digits: "females above thirty" does not work; use "females above 30".
6. **No OR logic between filters.** All matched filters are ANDed. You cannot query "males OR females from Ghana" — only AND combinations are supported.
7. **Multi-word country names must be exact.** "Democratic Republic of the Congo" works; partial names like "Congo" may match the Republic of the Congo (`CG`) instead.
8. **No confidence score filtering from NL.** Queries like "high confidence males" are not supported via natural language.
9. **`people`, `persons`, `individuals`** are treated as generic nouns (no filter), which is intentional but means a query like `people` alone with no other terms returns an error.
10. **Only ISO 2-letter country codes stored.** Country aliases in the NL map are best-effort and may not cover every variant a user might type.

---

## Error Responses

All errors follow this structure:
```json
{ "status": "error", "message": "<message>" }
```

| Status | Meaning |
|---|---|
| `400` | Missing/empty required param or invalid enum value |
| `422` | Parameter has wrong type (e.g. `min_age=abc`) or out-of-range value |
| `404` | Profile not found |
| `500` | Internal server error |

---

## Database Schema

```sql
CREATE TABLE profiles (
  id                  VARCHAR(36)   PRIMARY KEY,        -- UUID v7
  name                VARCHAR       UNIQUE NOT NULL,
  gender              VARCHAR       NOT NULL,            -- 'male' | 'female'
  gender_probability  FLOAT         NOT NULL,
  age                 INT           NOT NULL,
  age_group           VARCHAR       NOT NULL,            -- child | teenager | adult | senior
  country_id          VARCHAR(2)    NOT NULL,            -- ISO code
  country_name        VARCHAR       NOT NULL,
  country_probability FLOAT         NOT NULL,
  created_at          TIMESTAMPTZ   DEFAULT NOW()
);
```

Indexes are created on: `gender`, `age_group`, `country_id`, `age`, `created_at`, `gender_probability`, `country_probability`.
