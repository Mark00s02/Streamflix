import express from 'express';
import { allQuery, runQuery } from '../db/database.js';

const router = express.Router();

const mediaTypeOf = (value) => (value === 'tv' ? 'tv' : 'movie');

// Get user's watchlist (movies and series)
router.get('/', async (req, res) => {
  try {
    const watchlist = await allQuery(
      `SELECT movie_id AS id, media_type, title, overview, poster_path, release_date, rating, added_at
       FROM watchlist
       WHERE user_id = ?
       ORDER BY added_at DESC`,
      [req.userId]
    );

    res.json(watchlist);
  } catch (error) {
    console.error('Error fetching watchlist:', error);
    res.status(500).json({ error: 'Failed to fetch watchlist' });
  }
});

// Add movie or series to watchlist
router.post('/', async (req, res) => {
  try {
    const { movieId, title, overview, posterPath, releaseDate, rating, mediaType } = req.body;

    if (!movieId) {
      return res.status(400).json({ error: 'Movie ID required' });
    }

    await runQuery(
      `INSERT INTO watchlist (user_id, movie_id, media_type, title, overview, poster_path, release_date, rating)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.userId, String(movieId), mediaTypeOf(mediaType), title, overview, posterPath, releaseDate, rating || 0]
    );

    res.status(201).json({ message: 'Added to watchlist' });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      res.status(400).json({ error: 'Already in watchlist' });
    } else {
      console.error('Error adding to watchlist:', error);
      res.status(500).json({ error: 'Failed to add to watchlist' });
    }
  }
});

// Remove movie or series from watchlist
router.delete('/:movieId', async (req, res) => {
  try {
    await runQuery(
      'DELETE FROM watchlist WHERE user_id = ? AND movie_id = ? AND media_type = ?',
      [req.userId, req.params.movieId, mediaTypeOf(req.query.type)]
    );

    res.json({ message: 'Removed from watchlist' });
  } catch (error) {
    console.error('Error removing from watchlist:', error);
    res.status(500).json({ error: 'Failed to remove from watchlist' });
  }
});

export default router;
