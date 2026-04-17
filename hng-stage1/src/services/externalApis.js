/**
 * externalApis.js — Parallel enrichment from three public APIs
 *
 * APIs used:
 *   Genderize   → https://api.genderize.io?name={name}
 *   Agify       → https://api.agify.io?name={name}
 *   Nationalize → https://api.nationalize.io?name={name}
 *
 * All three are called in parallel with Promise.all() to minimise
 * response time. If any one of them returns unusable data, we throw
 * a structured error so the controller can return a clean 502.
 */

const axios = require('axios');

/**
 * Maps an age number to a human-readable age group string.
 * @param {number} age
 * @returns {'child'|'teenager'|'adult'|'senior'}
 */
function getAgeGroup(age) {
  if (age <= 12)  return 'child';
  if (age <= 19)  return 'teenager';
  if (age <= 59)  return 'adult';
  return 'senior';
}

/**
 * Fetches gender, age, and nationality data for a given name in parallel,
 * validates each response, applies classification logic, and returns a
 * single enriched object ready to be stored in the database.
 *
 * @param {string} name - The first name to enrich
 * @returns {Promise<Object>} Enriched profile data (no id / timestamps)
 * @throws {{ status: 502, message: string }} If any upstream API fails
 */
async function enrichName(name) {
  const encoded = encodeURIComponent(name);

  // Fire all three requests simultaneously
  const [genderRes, agifyRes, nationalizeRes] = await Promise.all([
    axios.get(`https://api.genderize.io?name=${encoded}`),
    axios.get(`https://api.agify.io?name=${encoded}`),
    axios.get(`https://api.nationalize.io?name=${encoded}`),
  ]);

  const genderData      = genderRes.data;
  const agifyData       = agifyRes.data;
  const nationalizeData = nationalizeRes.data;

  // ── Validate Genderize response ────────────────────────────────────────────
  if (!genderData.gender || genderData.count === 0) {
    const err = new Error('Genderize returned an invalid response');
    err.status = 502;
    throw err;
  }

  // ── Validate Agify response ────────────────────────────────────────────────
  if (agifyData.age === null || agifyData.age === undefined) {
    const err = new Error('Agify returned an invalid response');
    err.status = 502;
    throw err;
  }

  // ── Validate Nationalize response ──────────────────────────────────────────
  if (!nationalizeData.country || nationalizeData.country.length === 0) {
    const err = new Error('Nationalize returned an invalid response');
    err.status = 502;
    throw err;
  }

  // ── Classification ─────────────────────────────────────────────────────────
  // Pick the nationality with the highest probability
  const topCountry = nationalizeData.country.reduce((best, current) =>
    current.probability > best.probability ? current : best
  );

  return {
    name:                name.toLowerCase(), // normalise for consistent storage
    gender:              genderData.gender,
    gender_probability:  genderData.probability,
    sample_size:         genderData.count,
    age:                 agifyData.age,
    age_group:           getAgeGroup(agifyData.age),
    country_id:          topCountry.country_id,
    country_probability: topCountry.probability,
  };
}

module.exports = { enrichName };
