import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { movieService, watchlistService } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import MovieCard from '../components/MovieCard';
import '../styles/Search.css';

export default function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const { isAuthenticated } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    try {
      setLoading(true);
      setSearched(true);
      const response = await movieService.search(query);
      setResults(response.data);
    } catch (error) {
      addToast('Search failed. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToWatchlist = async (movie) => {
    if (!isAuthenticated) {
      addToast('Sign in to save movies to your watchlist', 'info');
      navigate('/login');
      return;
    }

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
    }
  };

  return (
    <div className="search-page">
      <div className="search-header">
        <h1>Search Movies</h1>
      </div>

      <div className="search-bar-wrap">
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            placeholder="Search for a movie..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="search-input"
            autoFocus
          />
          <button type="submit" disabled={loading || !query.trim()}>
            {loading ? '...' : 'Search'}
          </button>
        </form>
      </div>

      {loading && (
        <p className="status-msg">Searching...</p>
      )}

      {searched && !loading && results.length === 0 && (
        <p className="status-msg no-results">No results for "{query}"</p>
      )}

      {results.length > 0 && (
        <>
          <p className="results-count">{results.length} result{results.length !== 1 ? 's' : ''} for "{query}"</p>
          <div className="search-results">
            {results.map((movie) => (
              <MovieCard
                key={movie.id}
                movie={movie}
                onAddToWatchlist={() => handleAddToWatchlist(movie)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
