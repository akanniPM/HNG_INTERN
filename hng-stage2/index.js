require('dotenv').config();
const express = require('express');
const cors = require('cors');

const profilesRouter = require('./src/routes/profiles');

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

app.use('/api/profiles', profilesRouter);

app.use((req, res) => {
  res.status(404).json({ status: 'error', message: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ status: 'error', message: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
