
const express = require('express');
const axios   = require('axios');
const cors    = require('cors');

const app = express();

// Allow requests from any origin (important for frontend integrations)
app.use(cors());


// --- GET /api/classify
// Query param:  ?name=James
// Returns:      gender, probability, sample size, confidence flag, timestamp
app.get('/api/classify', async (req, res) => {
  const { name } = req.query;

  if (!name || name.trim() === '') {
    return res.status(400).json({
      status:  'error',
      message: 'Name parameter is required',
    });
  }

  if (typeof name !== 'string') {
    return res.status(422).json({
      status:  'error',
      message: 'Name must be a string',
    });
  }

  try {
     const { data } = await axios.get(
      `https://api.genderize.io?name=${encodeURIComponent(name)}`
    );

   if (data.gender === null || data.count === 0) {
      return res.status(200).json({
        status:  'error',
        message: 'No prediction available for the provided name',
      });
    }

    const sample_size  = data.count;
    const probability  = data.probability;
    const is_confident = probability >= 0.7 && sample_size >= 100;

    return res.status(200).json({
      status: 'success',
      data: {
        name:         data.name,
        gender:       data.gender,
        probability,
        sample_size,
        is_confident,
        processed_at: new Date().toISOString(), // UTC timestamp
      },
    });

  } catch (error) {
    // Something went wrong talking to genderize.io
    return res.status(502).json({
      status:  'error',
      message: 'Failed to reach upstream API',
    });
  }
});


// --- Start the server --------------------------------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
