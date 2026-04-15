import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tvService, watchlistService } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import MovieCard from '../components/MovieCard';
import MediaRow from '../components/MediaRow';
import '../styles/Anime.css';

const ANIME_GENRES = [
  { id: null, name: 'All Anime' },
  { id: 10759, name: 'Action & Adventure' },
  { id: 35, name: 'Comedy' },
  { id: 18, name: 'Drama' },
  { id: 10765, name: 'Sci-Fi & Fantasy' },
  { id: 9648, name: 'Mystery' },
  { id: 10749, name: 'Romance' },
  { id: 16, name: 'Animation' },
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

  const { isAuthenticated } = useAuth();
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
        tvService.getTopRated(),
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
      let res;
      if (activeGenre === null) {
        res = await tvService.getAnime(page);
      } else {
        // Anime + specific genre
        res = await tvService.discover(page, activeGenre);
      }
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
    if (!isAuthenticated) {
      addToast('Sign in to save to your watchlist', 'info');
      navigate('/login');
      return;
    }
    setAddingId(show.id);
    try {
      await watchlistService.addMovie(
        show.id,
        show.name || show.title,
        show.overview,
        show.poster_path,
        show.first_air_date || show.release_date,
        show.vote_average
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

  const maxPage = totalPages ? Math.min(totalPages, 500) : 500;

  return (
    <div className="anime-page">
      {/* Page header */}
      <div className="anime-header">
        <div className="anime-header-content">
          <div className="anime-title-group">
            <span className="anime-icon">⛩</span>
            <h1>Anime</h1>
          </div>
          <p>Japanese animation — explore thousands of series across every genre</p>
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
          <MediaRow title="Popular Anime" badge="ANIME" items={popular} mediaType="anime" />
          <MediaRow title="Top Rated" badge="TOP" items={topRated} mediaType="tv" />
        </>
      )}

      {/* Browse Section */}
      <div className="anime-browse">
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
            ← Prev
          </button>
          <span>Page {page}{totalPages ? ` of ${maxPage}` : ''}</span>
          <button onClick={() => setPage((p) => Math.min(maxPage, p + 1))} disabled={page >= maxPage || browseLoading}>
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}
