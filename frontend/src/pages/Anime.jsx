import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tvService, watchlistService } from '../api';
import { useToast } from '../context/ToastContext';
import MovieCard from '../components/MovieCard';
import MediaRow from '../components/MediaRow';
import '../styles/Anime.css';

import Icon from '../components/Icon';
const ANIME_GENRES = [
  { id: null, name: 'All Anime' },
  { id: 10759, name: 'Action & Adventure' },
  { id: 35, name: 'Comedy' },
  { id: 18, name: 'Drama' },
  { id: 10765, name: 'Sci-Fi & Fantasy' },
  { id: 9648, name: 'Mystery' },
  { id: 10749, name: 'Romance' },
];

export default function Anime() {
  const [featured, setFeatured] = useState([]);
  const [topRated, setTopRated] = useState([]);
  const [popular, setPopular] = useState([]);
  const [browseAnime, setBrowseAnime] = useState([]);
  const [activeGenre, setActiveGenre] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(null);
  const [loading, setLoading] = useState(true);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [addingId, setAddingId] = useState(null);

  // Search
  const [searchInput, setSearchInput]     = useState('');
  const [searchQuery, setSearchQuery]     = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchTotal,   setSearchTotal]   = useState(null);
  const [searchPage,    setSearchPage]    = useState(1);

  const { addToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadRows();
  }, []);

  useEffect(() => {
    loadBrowse();
  }, [activeGenre, page]);

  const loadRows = async () => {
    setLoading(true);
    try {
      const [topRes, popRes] = await Promise.allSettled([
        tvService.getAnime(1, { sort: 'top' }),
        tvService.getAnime(1),
      ]);
      if (topRes.status === 'fulfilled') setTopRated(topRes.value.data.results || topRes.value.data);
      if (popRes.status === 'fulfilled') {
        const results = popRes.value.data.results || [];
        setFeatured(results.slice(0, 5));
        setPopular(results);
      }
    } catch (err) {
      addToast('Failed to load anime content', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadBrowse = async () => {
    setBrowseLoading(true);
    try {
      const res = await tvService.getAnime(page, { genre: activeGenre });
      const data = res.data;
      setBrowseAnime(data.results || []);
      setTotalPages(data.total_pages || null);
    } catch (err) {
      addToast('Failed to load anime', 'error');
    } finally {
      setBrowseLoading(false);
    }
  };

  const handleAddToWatchlist = async (show) => {
    setAddingId(show.id);
    try {
      await watchlistService.addMovie(
        show.id,
        show.name || show.title,
        show.overview,
        show.poster_path,
        show.first_air_date || show.release_date,
        show.vote_average,
        'tv'
      );
      addToast(`"${show.name || show.title}" added to watchlist`, 'success');
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

  const handleGenreChange = (genreId) => {
    setActiveGenre(genreId);
    setPage(1);
  };

  // ── Search ────────────────────────────────────────────────────
  useEffect(() => {
    if (!searchQuery) return;
    runSearch(searchQuery, searchPage);
  }, [searchQuery, searchPage]);

  const runSearch = async (q, pg) => {
    setSearchLoading(true);
    try {
      const res = await tvService.searchAnime(q, pg);
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

  const maxPage = totalPages ? Math.min(totalPages, 500) : 500;

  // ── Banner backdrop (pick first popular anime with a backdrop) ──
  const bannerItem = popular.find((item) => item.backdrop_path) || null;
  const bannerStyle = bannerItem ? {
    backgroundImage: `radial-gradient(120% 90% at 0% 0%, rgba(245,176,65,0.16), transparent 55%), linear-gradient(90deg, rgba(8,9,13,0.94) 0%, rgba(8,9,13,0.7) 45%, rgba(8,9,13,0.35) 100%), url(https://image.tmdb.org/t/p/w1280${bannerItem.backdrop_path})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center top',
  } : {};

  return (
    <div className="anime-page">
      {/* Page header */}
      <div className="anime-header" style={bannerStyle}>
        <div className="anime-header-content">
          <div className="anime-title-group">
            <h1>Anime</h1>
          </div>
          <p>Japanese animation, from this season's hits to the classics.</p>
        </div>
      </div>

      {loading ? (
        <div className="anime-rows-skeleton">
          {[1, 2].map((i) => (
            <div key={i} className="row-skeleton-block">
              <div className="row-skeleton-title-sk" />
              <div className="row-skeleton-cards-sk">
                {Array.from({ length: 7 }).map((_, j) => (
                  <div key={j} className="row-skeleton-card-sk" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <MediaRow title="Popular anime" items={popular} mediaType="anime" seeAllTo="/browse/anime" />
          <MediaRow title="Top rated anime" items={topRated} mediaType="anime" seeAllTo="/browse/top-rated-anime" />
        </>
      )}

      {/* Browse Section */}
      <div className="anime-browse">
        <div className="anime-search-bar">
          <form onSubmit={handleSearchSubmit} className="anime-search-form">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search anime titles…"
              className="anime-search-input"
            />
            <button type="submit" className="anime-search-btn">Search</button>
            {searchQuery && (
              <button type="button" className="anime-search-clear" onClick={clearSearch}>
                <Icon name="close" size={14} /> Clear
              </button>
            )}
          </form>
        </div>

        {searchQuery ? (
          <>
            <p className="anime-search-label">Results for "<strong>{searchQuery}</strong>"</p>
            {searchLoading ? (
              <div className="loading-grid">
                {Array.from({ length: 20 }).map((_, i) => <div key={i} className="skeleton-card" />)}
              </div>
            ) : (
              <div className="movies-grid">
                {searchResults.map((show) => (
                  <MovieCard key={show.id} movie={show} mediaType="anime"
                    onAddToWatchlist={() => handleAddToWatchlist(show)}
                    showAddButton={addingId !== show.id} />
                ))}
                {searchResults.length === 0 && <p className="anime-empty">No results found.</p>}
              </div>
            )}
            {searchResults.length > 0 && (
              <div className="pagination">
                <button onClick={() => setSearchPage((p) => Math.max(1, p - 1))} disabled={searchPage === 1 || searchLoading}><Icon name="left" size={16} /> Previous</button>
                <span>Page {searchPage}{searchTotal ? ` of ${Math.min(searchTotal, 500)}` : ''}</span>
                <button onClick={() => setSearchPage((p) => Math.min(searchTotal || 500, p + 1))} disabled={searchPage >= (searchTotal || 500) || searchLoading}>Next <Icon name="right" size={16} /></button>
              </div>
            )}
          </>
        ) : (
          <>
            <h2 className="anime-browse-title">Browse Anime</h2>
            <div className="genre-pills">
              {ANIME_GENRES.map((g) => (
                <button
                  key={g.id ?? 'all'}
                  className={`genre-pill ${activeGenre === g.id ? 'active' : ''}`}
                  onClick={() => handleGenreChange(g.id)}
                >
                  {g.name}
                </button>
              ))}
            </div>

            {browseLoading ? (
              <div className="loading-grid">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div key={i} className="skeleton-card" />
                ))}
              </div>
            ) : (
              <div className="movies-grid">
                {browseAnime.map((show) => (
                  <MovieCard
                    key={show.id}
                    movie={show}
                    mediaType="anime"
                    onAddToWatchlist={() => handleAddToWatchlist(show)}
                    showAddButton={addingId !== show.id}
                  />
                ))}
              </div>
            )}

            <div className="pagination">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1 || browseLoading}>
                <Icon name="left" size={16} /> Previous
              </button>
              <span>Page {page}{totalPages ? ` of ${maxPage}` : ''}</span>
              <button onClick={() => setPage((p) => Math.min(maxPage, p + 1))} disabled={page >= maxPage || browseLoading}>
                Next <Icon name="right" size={16} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
