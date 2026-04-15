import express from 'express';
import axios from 'axios';
import { allQuery, getQuery, runQuery } from '../db/database.js';

const router = express.Router();
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Get trending movies (week)
router.get('/trending', async (req, res) => {
  try {
    const response = await axios.get(`${TMDB_BASE_URL}/trending/movie/week`, {
      params: { api_key: TMDB_API_KEY },
    });
    res.json(response.data.results);
  } catch (error) {
    console.error('Error fetching trending movies:', error);
    res.status(500).json({ error: 'Failed to fetch trending movies' });
  }
});

// Get movie genre list
router.get('/genres', async (req, res) => {
  try {
    const response = await axios.get(`${TMDB_BASE_URL}/genre/movie/list`, {
      params: { api_key: TMDB_API_KEY },
    });
    res.json(response.data.genres);
  } catch (error) {
    console.error('Error fetching genres:', error);
    res.status(500).json({ error: 'Failed to fetch genres' });
  }
});

// Now playing in theatres
router.get('/now-playing', async (req, res) => {
  try {
    const response = await axios.get(`${TMDB_BASE_URL}/movie/now_playing`, {
      params: { api_key: TMDB_API_KEY, page: 1 },
    });
    res.json(response.data.results);
  } catch (error) {
    console.error('Error fetching now playing:', error);
    res.status(500).json({ error: 'Failed to fetch now playing movies' });
  }
});

// Top rated movies
router.get('/top-rated', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  try {
    const response = await axios.get(`${TMDB_BASE_URL}/movie/top_rated`, {
      params: { api_key: TMDB_API_KEY, page },
    });
    res.json({ results: response.data.results, total_pages: response.data.total_pages });
  } catch (error) {
    console.error('Error fetching top rated:', error);
    res.status(500).json({ error: 'Failed to fetch top rated movies' });
  }
});

// Discover movies (with optional genre filter)
router.get('/discover', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const genreId = req.query.genre;
  const sortBy = req.query.sort_by || 'popularity.desc';
  try {
    const params = { api_key: TMDB_API_KEY, page, sort_by: sortBy };
    if (genreId) params.with_genres = genreId;
    const response = await axios.get(`${TMDB_BASE_URL}/discover/movie`, { params });
    res.json({ results: response.data.results, total_pages: response.data.total_pages });
  } catch (error) {
    console.error('Error discovering movies:', error);
    res.status(500).json({ error: 'Failed to discover movies' });
  }
});

// Get popular movies from TMDb and cache in database
router.get('/popular', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  try {

    // Always fetch fresh data from TMDb for correct pagination
    const response = await axios.get(`${TMDB_BASE_URL}/movie/popular`, {
      params: {
        api_key: TMDB_API_KEY,
        page,
      },
    });

    const movies = response.data.results;

    // Cache movies in the background (don't await — don't block the response)
    for (const movie of movies) {
      runQuery(
        `INSERT OR IGNORE INTO movies (id, tmdb_id, title, overview, poster_path, release_date, rating)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [movie.id, movie.id, movie.title, movie.overview, movie.poster_path, movie.release_date, movie.vote_average]
      ).catch(() => {});
    }

    res.json({ results: movies, page, total_pages: response.data.total_pages });
  } catch (error) {
    console.error('Error fetching popular movies:', error);
    // Fallback: try returning cached movies for the requested page
    try {
      const cached = await allQuery('SELECT * FROM movies LIMIT ? OFFSET ?', [20, (page - 1) * 20]);
      if (cached.length > 0) return res.json({ results: cached, page, total_pages: null });
    } catch (_) {}
    res.status(500).json({ error: 'Failed to fetch movies' });
  }
});

// Search movies
router.get('/search', async (req, res) => {
  try {
    const query = req.query.q;

    if (!query) {
      return res.status(400).json({ error: 'Search query required' });
    }

    const response = await axios.get(`${TMDB_BASE_URL}/search/movie`, {
      params: {
        api_key: TMDB_API_KEY,
        query: query,
      },
    });

    res.json(response.data.results);
  } catch (error) {
    console.error('Error searching movies:', error);
    res.status(500).json({ error: 'Failed to search movies' });
  }
});

// Get movie details
router.get('/:id', async (req, res) => {
  try {
    const movieId = req.params.id;

    const response = await axios.get(`${TMDB_BASE_URL}/movie/${movieId}`, {
      params: {
        api_key: TMDB_API_KEY,
      },
    });

    res.json(response.data);
  } catch (error) {
    console.error('Error fetching movie details:', error);
    res.status(500).json({ error: 'Failed to fetch movie details' });
  }
});

export default router;
