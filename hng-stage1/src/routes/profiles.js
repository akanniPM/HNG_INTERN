/**
 * profiles.js — Route definitions for /api/profiles
 *
 * Intentionally thin: routing only. All logic lives in the controller.
 */

const express = require('express');
const router  = express.Router();

const {
  createProfile,
  getProfile,
  getAllProfiles,
  deleteProfile,
} = require('../controllers/profileController');

router.post('/',    createProfile);   // POST   /api/profiles
router.get('/',     getAllProfiles);  // GET    /api/profiles
router.get('/:id',  getProfile);     // GET    /api/profiles/:id
router.delete('/:id', deleteProfile); // DELETE /api/profiles/:id

module.exports = router;
