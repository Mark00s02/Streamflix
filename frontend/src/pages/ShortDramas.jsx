import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { dailymotionService } from '../api';
import { useToast } from '../context/ToastContext';
import '../styles/ShortDramas.css';

const CATEGORIES = [
  { id: 'all',      label: 'All Dramas' },
  { id: 'korean',   label: '🇰🇷 Korean' },
  { id: 'chinese',  label: '🇨🇳 Chinese' },
  { id: 'thai',     label: '🇹🇭 Thai' },
  { id: 'romantic', label: '💕 Romantic' },
  { id: 'action',   label: '⚔️ Action' },
];

function formatDuration(seconds) {
  if (!seconds) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatViews(n) {
  if (!n) return null;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M views`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K views`;
  return `${n} views`;
}

function DramaCard({ video, onClick }) {
  const thumb = video.thumbnail_360_url || video.thumbnail_url;
  const dur   = formatDuration(video.duration);
  const views = formatViews(video.views_total);

  return (
    <div className="drama-card" onClick={() => onClick(video)}>
      <div className="drama-thumb">
        {thumb
          ? <img src={thumb} alt={video.title} loading="lazy" />
          : <div className="drama-thumb-placeholder">No Preview</div>}
        <div className="drama-play-overlay">▶</div>
        {dur && <span className="drama-dur">{dur}</span>}
      </div>
      <div className="drama-info">
        <p className="drama-title">{video.title}</p>
        {views && <span className="drama-views">{views}</span>}
      </div>
    </div>
  );
}

export default function ShortDramas() {
  const [videos,       setVideos]       = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery,  setSearchQuery]  = useState('');
  const [inputValue,   setInputValue]   = useState('');
  const [page,         setPage]         = useState(1);
  const [hasMore,      setHasMore]      = useState(true);
  const [loading,      setLoading]      = useState(true);
  const [bannerUrl,    setBannerUrl]    = useState(null);

  const { addToast } = useToast();
  const navigate     = useNavigate();

  const loadVideos = useCallback(async (cat, query, pg) => {
    setLoading(true);
    try {
      let res;
      if (query.trim()) {
        res = await dailymotionService.search(query.trim(), pg);
      } else {
        res = await dailymotionService.browse(cat, pg);
      }
      const data = res.data;
      const list = data.list || [];
      setVideos(list);
      setHasMore(data.has_more ?? list.length === 20);
    } catch {
      addToast('Failed to load dramas', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadVideos(activeCategory, searchQuery, page);
  }, [activeCategory, searchQuery, page, loadVideos]);

  // Pick first video thumbnail as banner background
  useEffect(() => {
    if (!bannerUrl && videos.length > 0) {
      const v = videos.find((vid) => vid.thumbnail_360_url || vid.thumbnail_url);
      if (v) setBannerUrl(v.thumbnail_360_url || v.thumbnail_url);
    }
  }, [videos, bannerUrl]);

  const handleCategoryChange = (id) => {
    setActiveCategory(id);
    setSearchQuery('');
    setInputValue('');
    setPage(1);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchQuery(inputValue);
    setActiveCategory('all');
    setPage(1);
  };

  const handleCardClick = (video) => {
    navigate(`/shortdramas/watch/${video.id}`, { state: { video } });
  };

  return (
    <div className="dramas-page">
      {/* Header */}
      <div className="dramas-header" style={bannerUrl ? {
        backgroundImage: `linear-gradient(135deg, rgba(92,10,46,0.92) 0%, rgba(139,0,64,0.82) 40%, rgba(45,0,21,0.88) 100%), url(${bannerUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      } : {}}>
        <div className="dramas-header-content">
          <div className="dramas-title-group">
            <span className="dramas-icon">🎭</span>
            <h1>Short Dramas</h1>
          </div>
          <p>Quick-episode drama series — Korean, Chinese, Thai &amp; more</p>
        </div>
      </div>

      {/* Search */}
      <div className="dramas-search-bar">
        <form onSubmit={handleSearch} className="dramas-search-form">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Search dramas…"
            className="dramas-search-input"
          />
          <button type="submit" className="dramas-search-btn">Search</button>
          {searchQuery && (
            <button type="button" className="dramas-search-clear"
              onClick={() => { setInputValue(''); setSearchQuery(''); setPage(1); }}>
              ✕ Clear
            </button>
          )}
        </form>
      </div>

      {/* Category pills */}
      {!searchQuery && (
        <div className="dramas-categories">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              className={`dramas-cat-pill ${activeCategory === c.id ? 'active' : ''}`}
              onClick={() => handleCategoryChange(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      <div className="dramas-content">
        {loading ? (
          <div className="dramas-skeleton-grid">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="drama-skeleton" />
            ))}
          </div>
        ) : videos.length === 0 ? (
          <div className="dramas-empty">
            <span>🎭</span>
            <p>No dramas found. Try a different search or category.</p>
          </div>
        ) : (
          <div className="dramas-grid">
            {videos.map((v) => (
              <DramaCard key={v.id} video={v} onClick={handleCardClick} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && videos.length > 0 && (
          <div className="dramas-pagination">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
            >
              ← Prev
            </button>
            <span>Page {page}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!hasMore || loading}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
