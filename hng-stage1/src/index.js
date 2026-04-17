/**
 * index.js — Application entry point
 *
 * Boot sequence:
 *   1. Load environment variables from .env (local dev only)
 *   2. Initialise the database (create table if not exists)
 *   3. Start the HTTP server
 */

require('dotenv').config();

const express        = require('express');
const cors           = require('cors');
const { initDB }     = require('./db');
const profileRoutes  = require('./routes/profiles');

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());                    // Access-Control-Allow-Origin: *
app.use(express.json());            // Parse JSON request bodies

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/profiles', profileRoutes);

// ── Health check (handy for Railway and manual testing) ───────────────────────
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'HNG Stage 1 API is running' });
});

// ── 404 fallback ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ status: 'error', message: 'Route not found' });
});

// ── Boot ──────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await initDB();                  // Ensure DB table exists before accepting traffic
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);                 // Exit so Railway can detect and restart the service
  }
}

start();
