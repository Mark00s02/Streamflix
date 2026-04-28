import express from 'express';
import axios from 'axios';

const router = express.Router();
const DM_API = 'https://api.dailymotion.com';
const FIELDS = 'id,title,thumbnail_360_url,thumbnail_url,duration,views_total,description,created_time';

// Category → search terms tuned for short drama content
const CATEGORIES = {
  all:      'short drama episode 1',
  korean:   'korean drama short kdrama',
  chinese:  'chinese drama short cdrama',
  thai:     'thai drama short lakorn',
  romantic: 'romantic short drama love',
  action:   'action short drama thriller',
};

router.get('/browse', async (req, res) => {
  try {
    const { category = 'all', page = 1 } = req.query;
    const searchTerm = CATEGORIES[category] || CATEGORIES.all;
    const response = await axios.get(`${DM_API}/videos`, {
      params: {
        search: searchTerm,
        fields: FIELDS,
        limit: 20,
        page,
        sort: 'visited',
      },
    });
    res.json(response.data);
  } catch (err) {
    console.error('Dailymotion browse error:', err.message);
    res.status(500).json({ error: 'Failed to fetch from Dailymotion' });
  }
});

router.get('/search', async (req, res) => {
  try {
    const { q = 'short drama', page = 1 } = req.query;
    const response = await axios.get(`${DM_API}/videos`, {
      params: {
        search: q,
        fields: FIELDS,
        limit: 20,
        page,
        sort: 'visited',
      },
    });
    res.json(response.data);
  } catch (err) {
    console.error('Dailymotion search error:', err.message);
    res.status(500).json({ error: 'Failed to search Dailymotion' });
  }
});

router.get('/video/:id', async (req, res) => {
  try {
    const response = await axios.get(`${DM_API}/video/${req.params.id}`, {
      params: { fields: FIELDS },
    });
    res.json(response.data);
  } catch (err) {
    console.error('Dailymotion video error:', err.message);
    res.status(500).json({ error: 'Failed to fetch video details' });
  }
});

export default router;
