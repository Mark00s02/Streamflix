import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { movieService, watchlistService } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import MovieCard from '../components/MovieCard';
import '../styles/Movies.css';

const SORT_OPTIONS = [
  { value: 'popularity.desc', label: 'Most Popular' },
  { value: 'vote_average.desc', label: 'Highest Rated' },
  { value: 'release_date.desc', label: 'Newest First' },
  { value: 'revenue.desc', label: 'Box Office' },
];

export default function Movies() {
  const [genres, setGenres] = useState([]);
  const [activeGenre, setActiveGenre] = useState(null);
  const [sortBy, setSortBy] = useState('popularity.desc');
  const [movies, setMovies] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(null);
  const [loading, setLoading] = useState(false);
  const [genreLoading, setGenreLoading] = useState(true);
  const [addingId, setAddingId] = useState(null);

  const { isAuthenticated } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    movieService.getGenres()
      .then((res) => setGenres(res.data))
      .catch(() => {})
      .finally(() => setGenreLoading(false));
  }, []);

  useEffect(() => {
    loadMovies();
  }, [activeGenre, sortBy, page]);

  const loadMovies = async () => {
    setLoading(true);
    try {
      let res;
      if (activeGenre === null && sortBy === 'popularity.desc') {
        res = await movieService.getPopular(page);
        setMovies(res.data.results);
        setTotalPages(res.data.total_pages);
      } else {
        res = await movieService.discover(page, activeGenre);
        setMovies(res.data.results);
        setTotalPages(res.data.total_pages);
      }
    } catch (err) {
      addToast('Failed to load movies', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGenreChange = (id) => {
    setActiveGenre(id);
    setPage(1);
  };

  const handleSortChange = (val) => {
    setSortBy(val);
    setPage(1);
  };

  const handleAddToWatchlist = async (movie) => {
    if (!isAuthenticated) {
      addToast('Sign in to save movies to your watchlist', 'info');
      navigate('/login');
      return;
    }
    setAddingId(movie.id);
    try {
      await watchlistService.addMovie(
        movie.id,
        movie.title,
        movie.overview,
        movie.poster_path,
        movie.release_date,
        movie.vote_average
      );
      addToast(`"${movie.title}" added to watchlist`, 'success');
    } catch (error) {
      if (error.response?.status === 400) {
        addToast('Already in your watchlist', 'warning');
      } else {
        addToast('Failed to add to watchlist', 'error');
      }
    } finally {
      setAddingId(null);
    }
  };

  const maxPage = totalPages ? Math.min(totalPages, 500) : 500;

  const activeGenreName = activeGenre === null
    ? 'All Movies'
    : genres.find((g) => g.id === activeGenre)?.name || 'Movies';

  return (
    <div className="movies-page">
      <div className="movies-page-header">
        <div>
          <h1>{activeGenreName}</h1>
          <p>{activeGenre === null ? 'Browse all movies' : `Browsing ${activeGenreName}`}</p>
        </div>
        <select
          className="sort-select"
          value={sortBy}
          onChange={(e) => handleSortChange(e.target.value)}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Genre pills */}
      {genreLoading ? (
        <div className="genre-pills-skeleton" />
      ) : (
        <div className="genre-pills">
          <button
            className={`genre-pill ${activeGenre === null ? 'active' : ''}`}
            onClick={() => handleGenreChange(null)}
          >
            All
          </button>
          {genres.map((g) => (
            <button
              key={g.id}
              className={`genre-pill ${activeGenre === g.id ? 'active' : ''}`}
              onClick={() => handleGenreChange(g.id)}
            >
              {g.name}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="loading-grid">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="skeleton-card" />
          ))}
        </div>
      ) : (
        <div className="movies-grid">
          {movies.map((movie) => (
            <MovieCard
              key={movie.id}
              movie={movie}
              onAddToWatchlist={() => handleAddToWatchlist(movie)}
              showAddButton={addingId !== movie.id}
            />
          ))}
        </div>
      )}

      <div className="pagination">
        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1 || loading}>
          ← Prev
        </button>
        <span>Page {page}{totalPages ? ` of ${maxPage}` : ''}</span>
        <button onClick={() => setPage((p) => Math.min(maxPage, p + 1))} disabled={page >= maxPage || loading}>
          Next →
        </button>
      </div>
    </div>
  );
}
