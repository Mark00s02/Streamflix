import express from 'express';
import axios from 'axios';

const router = express.Router();
const TMDB_API_KEY  = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// ── Country → TMDB origin params ─────────────────────────────
const COUNTRY_PARAMS = {
  korean:     { with_origin_country: 'KR', with_original_language: 'ko' },
  thai:       { with_origin_country: 'TH', with_original_language: 'th' },
  chinese:    { with_origin_country: 'CN', with_original_language: 'zh' },
  taiwanese:  { with_origin_country: 'TW' },
  japanese:   { with_origin_country: 'JP', with_original_language: 'ja' },
  vietnamese: { with_origin_country: 'VN', with_original_language: 'vi' },
  filipino:   { with_origin_country: 'PH', with_original_language: 'tl' },
};

// ── Type → TMDB filter params ─────────────────────────────────
const TYPE_PARAMS = {
  drama:   { with_genres: '18' },
  comedy:  { with_genres: '35' },
  bl:      { with_keywords: '210024,6647' },   // boys-love, yaoi
  gl:      { with_keywords: '6648,210025' },   // yuri, girls-love
};

// ── Helpers ───────────────────────────────────────────────────
const tmdbDiscover = (extra = {}) =>
  axios.get(`${TMDB_BASE_URL}/discover/tv`, {
    params: { api_key: TMDB_API_KEY, sort_by: 'popularity.desc', ...extra },
  });

// ── Browse — flexible filter endpoint ─────────────────────────
// GET /browse?country=korean&type=drama&page=1
router.get('/browse', async (req, res) => {
  const { country = 'all', type = 'all', page = 1 } = req.query;
  try {
    const countryExtra = country !== 'all' ? (COUNTRY_PARAMS[country] || {}) : {};
    const typeExtra    = type    !== 'all' ? (TYPE_PARAMS[type]    || {}) : {};

    // When browsing "all types" for a specific country, default to drama
    const fallback = (country !== 'all' && type === 'all') ? { with_genres: '18' } : {};

    const r = await tmdbDiscover({ page: parseInt(page), ...countryExtra, ...typeExtra, ...fallback });
    res.json({ results: r.data.results, total_pages: r.data.total_pages });
  } catch (e) {
    console.error('Asian drama browse error:', e.message);
    res.status(500).json({ error: 'Failed to browse dramas' });
  }
});

// ── Trending rows — NOTE: specific routes must come BEFORE /:country ──

router.get('/trending/bl', async (req, res) => {
  const extra = req.query.country ? (COUNTRY_PARAMS[req.query.country] || {}) : {};
  try {
    const r = await tmdbDiscover({ ...TYPE_PARAMS.bl, page: 1, ...extra });
    res.json(r.data.results.slice(0, 20));
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch BL dramas' });
  }
});

router.get('/trending/gl', async (req, res) => {
  const extra = req.query.country ? (COUNTRY_PARAMS[req.query.country] || {}) : {};
  try {
    const r = await tmdbDiscover({ ...TYPE_PARAMS.gl, page: 1, ...extra });
    res.json(r.data.results.slice(0, 20));
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch GL dramas' });
  }
});

// GET /trending/:country  (must be AFTER specific /trending/bl and /trending/gl)
router.get('/trending/:country', async (req, res) => {
  const cp = COUNTRY_PARAMS[req.params.country];
  if (!cp) return res.status(400).json({ error: 'Unknown country' });
  try {
    const r = await tmdbDiscover({ ...cp, ...TYPE_PARAMS.drama, page: 1 });
    res.json(r.data.results.slice(0, 20));
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch trending dramas' });
  }
});

// ── Search Asian dramas ──────────────────────────────────────
router.get('/search', async (req, res) => {
  const { q, page = 1 } = req.query;
  if (!q?.trim()) return res.status(400).json({ error: 'Query required' });
  try {
    const r = await axios.get(`${TMDB_BASE_URL}/search/tv`, {
      params: { api_key: TMDB_API_KEY, query: q.trim(), page: parseInt(page) },
    });
    res.json({ results: r.data.results, total_pages: r.data.total_pages });
  } catch (e) {
    console.error('Asian drama search error:', e.message);
    res.status(500).json({ error: 'Failed to search dramas' });
  }
});

export default router;
