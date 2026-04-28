import axios from 'axios';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const movieService = {
  getPopular: (page = 1) => api.get('/movies/popular', { params: { page } }),
  getTrending: () => api.get('/movies/trending'),
  getNowPlaying: () => api.get('/movies/now-playing'),
  getTopRated: (page = 1) => api.get('/movies/top-rated', { params: { page } }),
  getGenres: () => api.get('/movies/genres'),
  discover: (page = 1, genreId = null) =>
    api.get('/movies/discover', { params: { page, ...(genreId ? { genre: genreId } : {}) } }),
  search: (query) => api.get('/movies/search', { params: { q: query } }),
  getDetails: (id) => api.get(`/movies/${id}`),
};

export const tvService = {
  getTrending: () => api.get('/tv/trending'),
  getAnime: (page = 1) => api.get('/tv/anime', { params: { page } }),
  getPopular: (page = 1) => api.get('/tv/popular', { params: { page } }),
  getTopRated: (page = 1) => api.get('/tv/top-rated', { params: { page } }),
  getGenres: () => api.get('/tv/genres'),
  discover: (page = 1, genreId = null) =>
    api.get('/tv/discover', { params: { page, ...(genreId ? { genre: genreId } : {}) } }),
  getDetails: (id) => api.get(`/tv/${id}`),
  getSeason: (id, seasonNumber) => api.get(`/tv/${id}/season/${seasonNumber}`),
  search: (query, page = 1) => api.get('/tv/search', { params: { q: query, page } }),
};

export const authService = {
  register: (username, email, password) =>
    api.post('/users/register', { username, email, password }),
  login: (email, password) => api.post('/users/login', { email, password }),
};

export const asianDramaService = {
  browse:    (country = 'all', type = 'all', page = 1) =>
    api.get('/asiandrama/browse', { params: { country, type, page } }),
  trending:  (country)         => api.get(`/asiandrama/trending/${country}`),
  trendingBL:(country = null)  => api.get('/asiandrama/trending/bl',  { params: country ? { country } : {} }),
  trendingGL:(country = null)  => api.get('/asiandrama/trending/gl',  { params: country ? { country } : {} }),
  search:    (query, page = 1) => api.get('/asiandrama/search', { params: { q: query, page } }),
};

export const dailymotionService = {
  browse: (category = 'all', page = 1) => api.get('/dailymotion/browse', { params: { category, page } }),
  search: (q, page = 1) => api.get('/dailymotion/search', { params: { q, page } }),
  getVideo: (id) => api.get(`/dailymotion/video/${id}`),
};

export const watchlistService = {
  getWatchlist: () => api.get('/watchlist'),
  addMovie: (movieId, title, overview, posterPath, releaseDate, rating) =>
    api.post('/watchlist', { movieId, title, overview, posterPath, releaseDate, rating }),
  removeMovie: (movieId) => api.delete(`/watchlist/${movieId}`),
};

export default api;
