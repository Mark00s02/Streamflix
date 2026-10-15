import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { watchlistService } from '../api';
import { useToast } from '../context/ToastContext';
import { BROWSE_CATEGORIES } from '../browseCategories';
import MovieCard from '../components/MovieCard';
import Icon from '../components/Icon';
import '../styles/SeeAll.css';

const MAX_PAGES = 500; // TMDB's hard cap

export default function SeeAll() {
  const { category } = useParams();
  const config = BROWSE_CATEGORIES[category];
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [items, setItems] = useState([]);
  const [page, setPage] = useState(0);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const sentinelRef = useRef(null);
  const loadingRef = useRef(false);

  // Reset when the category changes
  useEffect(() => {
    setItems([]);
    setPage(0);
    setDone(false);
    setError(null);
    window.scrollTo(0, 0);
  }, [category]);

  const loadNext = useCallback(async () => {
    if (!config || loadingRef.current || done) return;
    loadingRef.current = true;
    setLoading(true);
    const next = page + 1;
    try {
      const { items: batch, totalPages } = await config.fetch(next);
      setItems((prev) => {
        const seen = new Set(prev.map((i) => i.id));
        return [...prev, ...batch.filter((i) => !seen.has(i.id))];
      });
      setPage(next);
      if (!batch.length || next >= Math.min(totalPages || MAX_PAGES, MAX_PAGES)) setDone(true);
    } catch {
      setError('Could not load more titles.');
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [config, page, done]);

  // Infinite scroll: load the next page when the sentinel nears the viewport
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || done || error) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) loadNext();
    }, { rootMargin: '600px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [loadNext, done, error]);

  const handleAdd = async (item) => {
    const type = config.mediaType === 'movie' ? 'movie' : 'tv';
    const title = item.title || item.name;
    try {
      await watchlistService.addMovie(item.id, title, item.overview, item.poster_path,
        item.release_date || item.first_air_date, item.vote_average, type);
      addToast(`Added "${title}" to your watchlist`, 'success');
    } catch (err) {
      addToast(err.response?.status === 400 ? 'Already in your watchlist' : 'Could not add to watchlist', 'warning');
    }
  };

  if (!config) {
    return (
      <div className="empty-state">
        <p>This list doesn't exist.</p>
        <Link className="btn btn-ghost" to="/">Go home</Link>
      </div>
    );
  }

  return (
    <div className="seeall-page">
      <div className="seeall-head">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Go back">
          <Icon name="back" size={20} />
        </button>
        <h1 className="seeall-title">{config.title}</h1>
        {items.length > 0 && <span className="seeall-count">{items.length} titles</span>}
      </div>

      <div className="movies-grid">
        {items.map((item) => (
          <MovieCard key={item.id} movie={item} mediaType={config.mediaType} onAddToWatchlist={() => handleAdd(item)} />
        ))}
        {loading && Array.from({ length: items.length ? 6 : 18 }).map((_, i) => <div key={`sk${i}`} className="skeleton-card" />)}
      </div>

      {error && (
        <div className="empty-state">
          <p>{error}</p>
          <button className="btn btn-ghost" onClick={() => { setError(null); loadNext(); }}>Try again</button>
        </div>
      )}
      {done && items.length > 0 && <p className="seeall-end">That's everything in this list.</p>}
      <div ref={sentinelRef} className="seeall-sentinel" />
    </div>
  );
}
