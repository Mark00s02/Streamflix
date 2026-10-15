import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { movieService, tvService, asianDramaService, watchlistService } from '../api';
import { useToast } from '../context/ToastContext';
import MovieCard from '../components/MovieCard';
import Icon from '../components/Icon';
import '../styles/Search.css';

// Each scope searches one section of the site
const SCOPES = [
  { id: 'all',    label: 'Movies & series' },
  { id: 'movies', label: 'Movies' },
  { id: 'anime',  label: 'Anime' },
  { id: 'drama',  label: 'Asian drama' },
  { id: 'short',  label: 'Short dramas' },
];

const asMovies = (list, mediaType) => (list || []).map((item) => ({ item, mediaType }));

async function runScope(scope, q) {
  switch (scope) {
    case 'movies':
      return asMovies((await movieService.search(q)).data, 'movie');
    case 'anime':
      return asMovies((await tvService.searchAnime(q)).data.results, 'anime');
    case 'drama':
      return asMovies((await asianDramaService.search(q)).data.results, 'tv');
    default: {
      const [movies, series] = await Promise.allSettled([movieService.search(q), tvService.search(q)]);
      const m = movies.status === 'fulfilled' ? asMovies(movies.value.data, 'movie') : [];
      const s = series.status === 'fulfilled' ? asMovies(series.value.data.results, 'tv') : [];
      // Interleave by popularity so the best matches of either kind come first
      return [...m, ...s].sort((a, b) => (b.item.popularity || 0) - (a.item.popularity || 0));
    }
  }
}

export default function Search() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const scope = SCOPES.some((s) => s.id === params.get('scope')) ? params.get('scope') : 'all';
  const q = params.get('q') || '';

  const [input, setInput] = useState(q);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => { setInput(q); }, [q]);

  useEffect(() => {
    if (scope === 'short') {
      navigate(`/shortdramas${q ? `?q=${encodeURIComponent(q)}` : ''}`, { replace: true });
      return;
    }
    if (!q) { setResults([]); return; }
    let cancelled = false;
    setLoading(true);
    setError(null);
    runScope(scope, q)
      .then((r) => { if (!cancelled) setResults(r); })
      .catch(() => { if (!cancelled) setError('Search failed. Check your connection and try again.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [scope, q, navigate]);

  const submit = (e) => {
    e.preventDefault();
    if (input.trim()) setParams({ scope, q: input.trim() });
  };

  const setScope = (id) => setParams(q ? { scope: id, q } : { scope: id });

  const handleAdd = async ({ item, mediaType }) => {
    const title = item.title || item.name;
    try {
      await watchlistService.addMovie(item.id, title, item.overview, item.poster_path,
        item.release_date || item.first_air_date, item.vote_average, mediaType === 'movie' ? 'movie' : 'tv');
      addToast(`Added "${title}" to your watchlist`, 'success');
    } catch (err) {
      addToast(err.response?.status === 400 ? 'Already in your watchlist' : 'Could not add to watchlist', 'warning');
    }
  };

  const scopeLabel = SCOPES.find((s) => s.id === scope).label;

  return (
    <div className="search-page">
      <form className="search-box" onSubmit={submit} role="search">
        <Icon name="search" size={22} />
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Search ${scopeLabel.toLowerCase()}`}
          aria-label={`Search ${scopeLabel.toLowerCase()}`}
          autoFocus={!q}
        />
        {input && (
          <button type="button" className="icon-btn" onClick={() => setInput('')} aria-label="Clear">
            <Icon name="close" size={18} />
          </button>
        )}
      </form>

      <div className="search-scopes" role="tablist" aria-label="Search in">
        {SCOPES.map((s) => (
          <button key={s.id} role="tab" aria-selected={scope === s.id}
            className={`chip ${scope === s.id ? 'active' : ''}`} onClick={() => setScope(s.id)}>
            {s.label}
          </button>
        ))}
      </div>

      {q && !loading && !error && (
        <p className="results-count">
          {results.length ? `${results.length} results for "${q}" in ${scopeLabel.toLowerCase()}` : `Nothing in ${scopeLabel.toLowerCase()} matches "${q}".`}
        </p>
      )}
      {error && <div className="empty-state"><p>{error}</p></div>}

      <div className="movies-grid">
        {!loading && results.map((r) => (
          <MovieCard key={`${r.mediaType}-${r.item.id}`} movie={r.item} mediaType={r.mediaType} onAddToWatchlist={() => handleAdd(r)} />
        ))}
        {loading && Array.from({ length: 12 }).map((_, i) => <div key={i} className="skeleton-card" />)}
      </div>

      {!q && <div className="empty-state"><p>Type a title and press Enter.</p></div>}
    </div>
  );
}
