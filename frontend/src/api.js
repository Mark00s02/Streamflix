import axios from 'axios';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});


export const movieService = {
  getPopular: (page = 1) => api.get('/movies/popular', { params: { page } }),
  getTrending: (page = 1) => api.get('/movies/trending', { params: { page } }),
  getNowPlaying: (page = 1) => api.get('/movies/now-playing', { params: { page } }),
  getTopRated: (page = 1) => api.get('/movies/top-rated', { params: { page } }),
  getGenres: () => api.get('/movies/genres'),
  discover: (page = 1, genreId = null) =>
    api.get('/movies/discover', { params: { page, ...(genreId ? { genre: genreId } : {}) } }),
  search: (query) => api.get('/movies/search', { params: { q: query } }),
  getDetails: (id) => api.get(`/movies/${id}`),
};

export const tvService = {
  getTrending: (page = 1) => api.get('/tv/trending', { params: { page } }),
  getAnime: (page = 1, { genre = null, sort = 'popular' } = {}) =>
    api.get('/tv/anime', { params: { page, sort, ...(genre ? { genre } : {}) } }),
  searchAnime: (query, page = 1) => api.get('/tv/anime/search', { params: { q: query, page } }),
  getPopular: (page = 1) => api.get('/tv/popular', { params: { page } }),
  getTopRated: (page = 1) => api.get('/tv/top-rated', { params: { page } }),
  getGenres: () => api.get('/tv/genres'),
  discover: (page = 1, genreId = null) =>
    api.get('/tv/discover', { params: { page, ...(genreId ? { genre: genreId } : {}) } }),
  getDetails: (id) => api.get(`/tv/${id}`),
  getSeason: (id, seasonNumber) => api.get(`/tv/${id}/season/${seasonNumber}`),
  search: (query, page = 1) => api.get('/tv/search', { params: { q: query, page } }),
};

export const asianDramaService = {
  browse:    (country = 'all', type = 'all', page = 1) =>
    api.get('/asiandrama/browse', { params: { country, type, page } }),
  trending:  (country, page = 1)        => api.get(`/asiandrama/trending/${country}`, { params: { page } }),
  trendingBL:(country = null, page = 1) => api.get('/asiandrama/trending/bl', { params: { page, ...(country ? { country } : {}) } }),
  trendingGL:(country = null, page = 1) => api.get('/asiandrama/trending/gl', { params: { page, ...(country ? { country } : {}) } }),
  search:    (query, page = 1) => api.get('/asiandrama/search', { params: { q: query, page } }),
};

export const dailymotionService = {
  browse: (category = 'all', page = 1) => api.get('/dailymotion/browse', { params: { category, page } }),
  search: (q, page = 1) => api.get('/dailymotion/search', { params: { q, page } }),
  getVideo: (id) => api.get(`/dailymotion/video/${id}`),
};

// Watchlist lives in this browser (no accounts). Same shape as the old API:
// methods return { data } and a duplicate add rejects with response.status 400.
const WATCHLIST_KEY = 'streamflix_watchlist';

const readWatchlist = () => {
  try { return JSON.parse(localStorage.getItem(WATCHLIST_KEY)) || []; } catch { return []; }
};
const writeWatchlist = (items) => {
  try { localStorage.setItem(WATCHLIST_KEY, JSON.stringify(items)); } catch { /* storage full or blocked */ }
};

export const watchlistService = {
  getWatchlist: async () => ({ data: readWatchlist() }),
  addMovie: async (movieId, title, overview, posterPath, releaseDate, rating, mediaType = 'movie') => {
    const items = readWatchlist();
    const id = String(movieId);
    if (items.some((i) => i.id === id && i.media_type === mediaType)) {
      throw Object.assign(new Error('Already in watchlist'), { response: { status: 400 } });
    }
    items.unshift({
      id, media_type: mediaType, title, overview, poster_path: posterPath,
      release_date: releaseDate, rating: rating || 0, added_at: new Date().toISOString(),
    });
    writeWatchlist(items);
    return { data: { message: 'Added to watchlist' } };
  },
  removeMovie: async (movieId, mediaType = 'movie') => {
    writeWatchlist(readWatchlist().filter((i) => !(i.id === String(movieId) && i.media_type === mediaType)));
    return { data: { message: 'Removed from watchlist' } };
  },
};

export default api;
