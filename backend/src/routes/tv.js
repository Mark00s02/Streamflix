import express from 'express';
import axios from 'axios';

const router = express.Router();
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Trending TV shows this week
router.get('/trending', async (req, res) => {
  try {
    const response = await axios.get(`${TMDB_BASE_URL}/trending/tv/week`, {
      params: { api_key: TMDB_API_KEY },
    });
    res.json(response.data.results);
  } catch (error) {
    console.error('Error fetching trending TV:', error);
    res.status(500).json({ error: 'Failed to fetch trending TV shows' });
  }
});

// Anime — Japanese animation (genre 16, language ja)
router.get('/anime', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  try {
    const response = await axios.get(`${TMDB_BASE_URL}/discover/tv`, {
      params: {
        api_key: TMDB_API_KEY,
        with_genres: 16,
        with_original_language: 'ja',
        sort_by: 'popularity.desc',
        page,
      },
    });
    res.json({ results: response.data.results, total_pages: response.data.total_pages });
  } catch (error) {
    console.error('Error fetching anime:', error);
    res.status(500).json({ error: 'Failed to fetch anime' });
  }
});

// Popular TV shows
router.get('/popular', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  try {
    const response = await axios.get(`${TMDB_BASE_URL}/tv/popular`, {
      params: { api_key: TMDB_API_KEY, page },
    });
    res.json({ results: response.data.results, total_pages: response.data.total_pages });
  } catch (error) {
    console.error('Error fetching popular TV:', error);
    res.status(500).json({ error: 'Failed to fetch popular TV shows' });
  }
});

// TV genre list
router.get('/genres', async (req, res) => {
  try {
    const response = await axios.get(`${TMDB_BASE_URL}/genre/tv/list`, {
      params: { api_key: TMDB_API_KEY },
    });
    res.json(response.data.genres);
  } catch (error) {
    console.error('Error fetching TV genres:', error);
    res.status(500).json({ error: 'Failed to fetch TV genres' });
  }
});

// Discover TV shows by genre
router.get('/discover', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const genreId = req.query.genre;
  try {
    const params = { api_key: TMDB_API_KEY, page, sort_by: 'popularity.desc' };
    if (genreId) params.with_genres = genreId;
    const response = await axios.get(`${TMDB_BASE_URL}/discover/tv`, { params });
    res.json({ results: response.data.results, total_pages: response.data.total_pages });
  } catch (error) {
    console.error('Error discovering TV:', error);
    res.status(500).json({ error: 'Failed to discover TV shows' });
  }
});

// Top rated TV
router.get('/top-rated', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  try {
    const response = await axios.get(`${TMDB_BASE_URL}/tv/top_rated`, {
      params: { api_key: TMDB_API_KEY, page },
    });
    res.json({ results: response.data.results, total_pages: response.data.total_pages });
  } catch (error) {
    console.error('Error fetching top rated TV:', error);
    res.status(500).json({ error: 'Failed to fetch top rated TV shows' });
  }
});

// Season details (episodes list)
router.get('/:id/season/:seasonNumber', async (req, res) => {
  try {
    const response = await axios.get(
      `${TMDB_BASE_URL}/tv/${req.params.id}/season/${req.params.seasonNumber}`,
      { params: { api_key: TMDB_API_KEY } }
    );
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching season details:', error);
    res.status(500).json({ error: 'Failed to fetch season details' });
  }
});

// TV show details
router.get('/:id', async (req, res) => {
  try {
    const response = await axios.get(`${TMDB_BASE_URL}/tv/${req.params.id}`, {
      params: { api_key: TMDB_API_KEY },
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching TV details:', error);
    res.status(500).json({ error: 'Failed to fetch TV details' });
  }
});

export default router;
