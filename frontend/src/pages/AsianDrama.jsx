import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { asianDramaService, watchlistService } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import MediaRow from '../components/MediaRow';
import MovieCard from '../components/MovieCard';
import '../styles/AsianDrama.css';

const COUNTRIES = [
  { id: 'all',        label: 'All',        flag: null   },
  { id: 'korean',     label: 'Korean',     flag: '🇰🇷'  },
  { id: 'thai',       label: 'Thai',       flag: '🇹🇭'  },
  { id: 'chinese',    label: 'Chinese',    flag: '🇨🇳'  },
  { id: 'taiwanese',  label: 'Taiwanese',  flag: '🇹🇼'  },
  { id: 'japanese',   label: 'Japanese',   flag: '🇯🇵'  },
  { id: 'vietnamese', label: 'Vietnamese', flag: '🇻🇳'  },
  { id: 'filipino',   label: 'Filipino',   flag: '🇵🇭'  },
];

const TYPES = [
  { id: 'all',    label: 'All',          accent: null     },
  { id: 'drama',  label: 'Drama',        accent: null     },
  { id: 'comedy', label: 'Comedy',       accent: null     },
  { id: 'bl',     label: 'BL',           accent: 'bl'     },
  { id: 'gl',     label: 'GL',           accent: 'gl'     },
];

// Featured rows shown on the default "All" view
const FEATURED_ROWS = [
  { key: 'korean',    label: 'Trending K-Drama',    fetch: (s) => s.trending('korean')    },
  { key: 'japanese',  label: 'Trending J-Drama',    fetch: (s) => s.trending('japanese')  },
  { key: 'chinese',   label: 'Trending C-Drama',    fetch: (s) => s.trending('chinese')   },
  { key: 'taiwanese', label: 'Trending TW-Drama',   fetch: (s) => s.trending('taiwanese') },
  { key: 'bl',        label: 'BL / Boys Love',      fetch: (s) => s.trendingBL(),          badge: 'BL' },
  { key: 'gl',        label: 'GL / Girls Love',     fetch: (s) => s.trendingGL(),          badge: 'GL' },
  { key: 'thai',      label: 'Trending Thai Drama', fetch: (s) => s.trending('thai')      },
  { key: 'filipino',  label: 'Trending Filipino',   fetch: (s) => s.trending('filipino')  },
  { key: 'vietnamese',label: 'Trending Vietnamese', fetch: (s) => s.trending('vietnamese')},
];

export default function AsianDrama() {
  const [rows,         setRows]         = useState({});   // { key: [] }
  const [rowsLoading,  setRowsLoading]  = useState(true);
  const [browseList,   setBrowseList]   = useState([]);
  const [browseLoading,setBrowseLoading]= useState(false);
  const [activeCountry,setActiveCountry]= useState('all');
  const [activeType,   setActiveType]   = useState('all');
  const [page,         setPage]         = useState(1);
  const [totalPages,   setTotalPages]   = useState(null);
  const [addingId,     setAddingId]     = useState(null);

  // Search
  const [searchInput,   setSearchInput]   = useState('');
  const [searchQuery,   setSearchQuery]   = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchTotal,   setSearchTotal]   = useState(null);
  const [searchPage,    setSearchPage]    = useState(1);

  const { isAuthenticated } = useAuth();
  const { addToast }        = useToast();
  const navigate            = useNavigate();

  // ── Load featured rows (All view) ─────────────────────────────
  useEffect(() => {
    setRowsLoading(true);
    const settled = FEATURED_ROWS.map((r) =>
      r.fetch(asianDramaService)
        .then((res) => ({ key: r.key, data: res.data }))
        .catch(() => ({ key: r.key, data: [] }))
    );
    Promise.all(settled).then((results) => {
      const map = {};
      results.forEach(({ key, data }) => { map[key] = data; });
      setRows(map);
      setRowsLoading(false);
    });
  }, []);

  // ── Browse grid ───────────────────────────────────────────────
  const loadBrowse = useCallback(async (country, type, pg) => {
    setBrowseLoading(true);
    try {
      const res  = await asianDramaService.browse(country, type, pg);
      const data = res.data;
      setBrowseList(data.results || []);
      setTotalPages(data.total_pages || null);
    } catch {
      addToast('Failed to load dramas', 'error');
    } finally {
      setBrowseLoading(false);
    }
  }, [addToast]);

  // Browse whenever filter or page changes (skip for full "All/All" state which uses rows)
  useEffect(() => {
    if (activeCountry === 'all' && activeType === 'all') return;
    loadBrowse(activeCountry, activeType, page);
  }, [activeCountry, activeType, page, loadBrowse]);

  const handleCountryChange = (id) => { setActiveCountry(id); setPage(1); clearSearch(); };
  const handleTypeChange    = (id) => { setActiveType(id);    setPage(1); clearSearch(); };

  // ── Search ────────────────────────────────────────────────────
  useEffect(() => {
    if (!searchQuery) return;
    runSearch(searchQuery, searchPage);
  }, [searchQuery, searchPage]);

  const runSearch = async (q, pg) => {
    setSearchLoading(true);
    try {
      const res = await asianDramaService.search(q, pg);
      setSearchResults(res.data.results || []);
      setSearchTotal(res.data.total_pages || null);
    } catch {
      addToast('Search failed', 'error');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    setSearchQuery(searchInput.trim());
    setSearchPage(1);
  };

  const clearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
    setSearchResults([]);
    setSearchPage(1);
  };

  const showRows  = activeCountry === 'all' && activeType === 'all' && !searchQuery;
  const maxPage   = totalPages ? Math.min(totalPages, 500) : 500;

  const handleAddToWatchlist = async (show) => {
    if (!isAuthenticated) { addToast('Sign in to save to your watchlist', 'info'); navigate('/login'); return; }
    setAddingId(show.id);
    try {
      await watchlistService.addMovie(
        show.id, show.name || show.title, show.overview,
        show.poster_path, show.first_air_date || show.release_date, show.vote_average,
      );
      addToast(`"${show.name || show.title}" added to watchlist`, 'success');
    } catch (err) {
      addToast(err.response?.status === 400 ? 'Already in your watchlist' : 'Failed to add', 'warning');
    } finally {
      setAddingId(null);
    }
  };

  const activeCountryObj = COUNTRIES.find((c) => c.id === activeCountry);
  const activeTypeObj    = TYPES.find((t) => t.id === activeType);

  // ── Banner backdrop (pick from loaded rows) ───────────────────
  const bannerItem = useMemo(() => {
    for (const key of ['korean', 'japanese', 'taiwanese', 'thai']) {
      const item = (rows[key] || []).find((i) => i.backdrop_path);
      if (item) return item;
    }
    return null;
  }, [rows]);

  const bannerStyle = bannerItem ? {
    backgroundImage: `linear-gradient(135deg, rgba(26,11,46,0.92) 0%, rgba(61,12,62,0.82) 35%, rgba(107,26,46,0.75) 65%, rgba(26,11,46,0.88) 100%), url(https://image.tmdb.org/t/p/w1280${bannerItem.backdrop_path})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center top',
  } : {};

  return (
    <div className="ad-page">

      {/* ── Header ── */}
      <div className="ad-header" style={bannerStyle}>
        <div className="ad-header-content">
          <h1 className="ad-header-title">Asian Drama</h1>
          <p className="ad-header-sub">
            Korean, Thai, Chinese, Taiwanese, Japanese, Vietnamese &amp; Filipino dramas —
            Drama, Comedy, BL &amp; GL
          </p>
          <div className="ad-header-tags">
            {['K-Drama', 'J-Drama', 'C-Drama', 'Thai', 'Taiwanese', 'Filipino', 'Vietnamese', 'BL', 'GL', 'Romance', 'Comedy'].map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Search bar ── */}
      <div className="ad-search-bar">
        <form onSubmit={handleSearchSubmit} className="ad-search-form">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search Korean, Thai, Chinese dramas…"
            className="ad-search-input"
          />
          <button type="submit" className="ad-search-btn">Search</button>
          {searchQuery && (
            <button type="button" className="ad-search-clear" onClick={clearSearch}>
              ✕ Clear
            </button>
          )}
        </form>
      </div>

      {/* ── Filters (hidden when searching) ── */}
      {!searchQuery && <div className="ad-filters">
        {/* Country tabs */}
        <div className="ad-filter-row">
          <span className="ad-filter-label">Country</span>
          <div className="ad-country-tabs">
            {COUNTRIES.map((c) => (
              <button
                key={c.id}
                className={`ad-country-tab ${activeCountry === c.id ? 'active' : ''}`}
                onClick={() => handleCountryChange(c.id)}
              >
                {c.flag && <span className="ad-flag">{c.flag}</span>}
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Type pills */}
        <div className="ad-filter-row">
          <span className="ad-filter-label">Type</span>
          <div className="ad-type-pills">
            {TYPES.map((t) => (
              <button
                key={t.id}
                className={`ad-type-pill ${activeType === t.id ? 'active' : ''} ${t.accent ? `ad-type-pill--${t.accent}` : ''}`}
                onClick={() => handleTypeChange(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>}

      {/* ── Active filter summary ── */}
      {!showRows && !searchQuery && (
        <div className="ad-filter-summary">
          Showing{' '}
          <strong>
            {activeCountryObj?.flag && `${activeCountryObj.flag} `}
            {activeCountryObj?.id !== 'all' ? activeCountryObj?.label : 'All'}{' '}
            {activeTypeObj?.id !== 'all' ? activeTypeObj?.label : 'Dramas'}
          </strong>
        </div>
      )}

      {/* ── Featured rows (All/All view) ── */}
      {showRows && (
        rowsLoading ? (
          <div className="ad-rows-skeleton">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="ad-row-skeleton">
                <div className="ad-row-sk-title" />
                <div className="ad-row-sk-cards">
                  {Array.from({ length: 7 }).map((_, j) => <div key={j} className="ad-row-sk-card" />)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {FEATURED_ROWS.map((r) =>
              (rows[r.key] || []).length > 0 ? (
                <MediaRow key={r.key} title={r.label} items={rows[r.key]} mediaType="tv" badge={r.badge} />
              ) : null
            )}
          </>
        )
      )}

      {/* ── Search results ── */}
      {searchQuery && (
        <div className="ad-browse">
          <p className="ad-search-label">Results for "<strong>{searchQuery}</strong>"</p>
          {searchLoading ? (
            <div className="ad-grid-skeleton">
              {Array.from({ length: 20 }).map((_, i) => <div key={i} className="ad-skeleton-card" />)}
            </div>
          ) : (
            <>
              <div className="movies-grid">
                {searchResults.map((show) => (
                  <MovieCard key={show.id} movie={show} mediaType="tv"
                    onAddToWatchlist={() => handleAddToWatchlist(show)}
                    showAddButton={addingId !== show.id} />
                ))}
                {searchResults.length === 0 && <p className="ad-empty">No results found.</p>}
              </div>
              {searchResults.length > 0 && (
                <div className="pagination">
                  <button onClick={() => setSearchPage((p) => Math.max(1, p - 1))} disabled={searchPage === 1 || searchLoading}>← Prev</button>
                  <span>Page {searchPage}{searchTotal ? ` of ${Math.min(searchTotal, 500)}` : ''}</span>
                  <button onClick={() => setSearchPage((p) => Math.min(searchTotal || 500, p + 1))} disabled={searchPage >= (searchTotal || 500) || searchLoading}>Next →</button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Browse grid (filtered view) ── */}
      {!showRows && !searchQuery && (
        <div className="ad-browse">
          {browseLoading ? (
            <div className="ad-grid-skeleton">
              {Array.from({ length: 20 }).map((_, i) => <div key={i} className="ad-skeleton-card" />)}
            </div>
          ) : (
            <>
              <div className="movies-grid">
                {browseList.map((show) => (
                  <MovieCard
                    key={show.id}
                    movie={show}
                    mediaType="tv"
                    onAddToWatchlist={() => handleAddToWatchlist(show)}
                    showAddButton={addingId !== show.id}
                  />
                ))}
                {browseList.length === 0 && (
                  <p className="ad-empty">No results found. TMDB may have limited data for this combination.</p>
                )}
              </div>

              {browseList.length > 0 && (
                <div className="pagination">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1 || browseLoading}>
                    ← Prev
                  </button>
                  <span>Page {page}{totalPages ? ` of ${maxPage}` : ''}</span>
                  <button onClick={() => setPage((p) => Math.min(maxPage, p + 1))} disabled={page >= maxPage || browseLoading}>
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

    </div>
  );
}
