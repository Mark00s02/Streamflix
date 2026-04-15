import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { watchlistService } from '../api';
import { useToast } from '../context/ToastContext';
import MovieCard from '../components/MovieCard';
import '../styles/Watchlist.css';

export default function Watchlist() {
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  useEffect(() => {
    fetchWatchlist();
  }, []);

  const fetchWatchlist = async () => {
    try {
      setLoading(true);
      const response = await watchlistService.getWatchlist();
      setWatchlist(response.data);
    } catch (error) {
      addToast('Failed to load watchlist', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (movie) => {
    try {
      await watchlistService.removeMovie(movie.id);
      setWatchlist((prev) => prev.filter((m) => m.id !== movie.id));
      addToast(`"${movie.title}" removed from watchlist`, 'info');
    } catch (error) {
      addToast('Failed to remove from watchlist', 'error');
    }
  };

  return (
    <div className="watchlist">
      <div className="page-header">
        <h1>My Watchlist</h1>
        {!loading && <p>{watchlist.length} movie{watchlist.length !== 1 ? 's' : ''} saved</p>}
      </div>

      {loading && (
        <div className="loading-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton-card" />
          ))}
        </div>
      )}

      {!loading && watchlist.length === 0 && (
        <div className="empty-watchlist">
          <p>Your watchlist is empty</p>
          <Link to="/">Browse movies</Link>
        </div>
      )}

      <div className="watchlist-grid">
        {watchlist.map((movie) => (
          <div key={movie.id} className="watchlist-item">
            <MovieCard movie={movie} showAddButton={false} />
            <button
              onClick={() => handleRemove(movie)}
              className="remove-btn"
              aria-label={`Remove ${movie.title} from watchlist`}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
