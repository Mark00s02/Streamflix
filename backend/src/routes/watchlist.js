import express from 'express';
import { allQuery, runQuery, getQuery } from '../db/database.js';

const router = express.Router();

// Get user's watchlist
router.get('/', async (req, res) => {
  try {
    const userId = req.userId;

    const watchlist = await allQuery(
      `SELECT m.* FROM movies m
       JOIN watchlist w ON m.id = w.movie_id
       WHERE w.user_id = ?
       ORDER BY w.added_at DESC`,
      [userId]
    );

    res.json(watchlist);
  } catch (error) {
    console.error('Error fetching watchlist:', error);
    res.status(500).json({ error: 'Failed to fetch watchlist' });
  }
});

// Add movie to watchlist
router.post('/', async (req, res) => {
  try {
    const userId = req.userId;
    const { movieId, title, overview, posterPath, releaseDate, rating } = req.body;

    if (!movieId) {
      return res.status(400).json({ error: 'Movie ID required' });
    }

    // Check if movie exists in database, if not add it
    const existingMovie = await getQuery('SELECT id FROM movies WHERE id = ?', [movieId]);

    if (!existingMovie) {
      await runQuery(
        `INSERT INTO movies (id, tmdb_id, title, overview, poster_path, release_date, rating)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [movieId, movieId, title, overview, posterPath, releaseDate, rating || 0]
      );
    }

    // Add to watchlist
    await runQuery(
      'INSERT INTO watchlist (user_id, movie_id) VALUES (?, ?)',
      [userId, movieId]
    );

    res.status(201).json({ message: 'Movie added to watchlist' });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      res.status(400).json({ error: 'Movie already in watchlist' });
    } else {
      console.error('Error adding to watchlist:', error);
      res.status(500).json({ error: 'Failed to add to watchlist' });
    }
  }
});

// Remove movie from watchlist
router.delete('/:movieId', async (req, res) => {
  try {
    const userId = req.userId;
    const movieId = req.params.movieId;

    await runQuery(
      'DELETE FROM watchlist WHERE user_id = ? AND movie_id = ?',
      [userId, movieId]
    );

    res.json({ message: 'Movie removed from watchlist' });
  } catch (error) {
    console.error('Error removing from watchlist:', error);
    res.status(500).json({ error: 'Failed to remove from watchlist' });
  }
});

export default router;
