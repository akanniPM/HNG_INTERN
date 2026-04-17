/**
 * profileController.js — Request handlers for all /api/profiles endpoints
 *
 * Each function maps to one HTTP action:
 *   createProfile  → POST   /api/profiles
 *   getProfile     → GET    /api/profiles/:id
 *   getAllProfiles  → GET    /api/profiles
 *   deleteProfile  → DELETE /api/profiles/:id
 */

const { v7: uuidv7 } = require('uuid');
const { pool }       = require('../db');
const { enrichName } = require('../services/externalApis');


// ─── POST /api/profiles ───────────────────────────────────────────────────────
// Accepts { name }, enriches it via 3 external APIs, stores in DB.
// If the name already exists, returns the stored record (idempotent).
async function createProfile(req, res) {
  const { name } = req.body;

  // Validate: name must be present and non-empty
  if (!name || String(name).trim() === '') {
    return res.status(400).json({
      status:  'error',
      message: 'Name parameter is required',
    });
  }

  // Validate: name must be a plain string, not an object / array
  if (typeof name !== 'string') {
    return res.status(422).json({
      status:  'error',
      message: 'Name must be a string',
    });
  }

  try {
    const normalisedName = name.trim().toLowerCase();

    // ── Idempotency check ────────────────────────────────────────────────────
    // If this name was already stored, return it immediately — no duplicate.
    const existing = await pool.query(
      'SELECT * FROM profiles WHERE name = $1',
      [normalisedName]
    );

    if (existing.rows.length > 0) {
      return res.status(200).json({
        status:  'success',
        message: 'Profile already exists',
        data:    formatProfile(existing.rows[0]),
      });
    }

    // ── Enrich the name via external APIs ────────────────────────────────────
    const enriched = await enrichName(normalisedName);

    // ── Persist to database ──────────────────────────────────────────────────
    const id = uuidv7(); // UUID v7 — time-ordered, spec-compliant

    const result = await pool.query(
      `INSERT INTO profiles
         (id, name, gender, gender_probability, sample_size,
          age, age_group, country_id, country_probability, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
       RETURNING *`,
      [
        id,
        enriched.name,
        enriched.gender,
        enriched.gender_probability,
        enriched.sample_size,
        enriched.age,
        enriched.age_group,
        enriched.country_id,
        enriched.country_probability,
      ]
    );

    return res.status(201).json({
      status: 'success',
      data:   formatProfile(result.rows[0]),
    });

  } catch (err) {
    // 502 errors are thrown deliberately by enrichName()
    if (err.status === 502) {
      return res.status(502).json({
        status:  'error',
        message: err.message,
      });
    }

    console.error('createProfile error:', err);
    return res.status(500).json({
      status:  'error',
      message: 'Internal server error',
    });
  }
}


// ─── GET /api/profiles/:id ────────────────────────────────────────────────────
async function getProfile(req, res) {
  try {
    const result = await pool.query(
      'SELECT * FROM profiles WHERE id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status:  'error',
        message: 'Profile not found',
      });
    }

    return res.status(200).json({
      status: 'success',
      data:   formatProfile(result.rows[0]),
    });

  } catch (err) {
    console.error('getProfile error:', err);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
}


// ─── GET /api/profiles ────────────────────────────────────────────────────────
// Optional filters: ?gender=male&country_id=NG&age_group=adult
// All comparisons are case-insensitive.
async function getAllProfiles(req, res) {
  try {
    const { gender, country_id, age_group } = req.query;

    // Build the WHERE clause dynamically based on which filters were provided
    const conditions = [];
    const values     = [];

    if (gender) {
      values.push(gender.toLowerCase());
      conditions.push(`gender = $${values.length}`);
    }
    if (country_id) {
      values.push(country_id.toUpperCase());
      conditions.push(`UPPER(country_id) = $${values.length}`);
    }
    if (age_group) {
      values.push(age_group.toLowerCase());
      conditions.push(`age_group = $${values.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await pool.query(
      `SELECT * FROM profiles ${where} ORDER BY created_at DESC`,
      values
    );

    return res.status(200).json({
      status: 'success',
      count:  result.rows.length,
      data:   result.rows.map(formatProfile),
    });

  } catch (err) {
    console.error('getAllProfiles error:', err);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
}


// ─── DELETE /api/profiles/:id ─────────────────────────────────────────────────
// Returns 204 No Content on success (no body), 404 if the id doesn't exist.
async function deleteProfile(req, res) {
  try {
    const result = await pool.query(
      'DELETE FROM profiles WHERE id = $1 RETURNING id',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status:  'error',
        message: 'Profile not found',
      });
    }

    // 204 — success, no body
    return res.status(204).send();

  } catch (err) {
    console.error('deleteProfile error:', err);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
}


// ─── Helper ───────────────────────────────────────────────────────────────────
// Ensures the response shape always matches the spec exactly,
// regardless of how pg returns the row.
function formatProfile(row) {
  return {
    id:                  row.id,
    name:                row.name,
    gender:              row.gender,
    gender_probability:  row.gender_probability,
    sample_size:         row.sample_size,
    age:                 row.age,
    age_group:           row.age_group,
    country_id:          row.country_id,
    country_probability: row.country_probability,
    created_at:          row.created_at,
  };
}


module.exports = { createProfile, getProfile, getAllProfiles, deleteProfile };
