import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { movieService, tvService, watchlistService } from '../api';
import { useToast } from '../context/ToastContext';
import MovieCard from '../components/MovieCard';
import MediaRow from '../components/MediaRow';
import HeroBanner from '../components/HeroBanner';
import '../styles/Home.css';

import Icon from '../components/Icon';
const SORT_OPTIONS = [
  { value: 'popularity.desc', label: 'Most Popular' },
  { value: 'vote_average.desc', label: 'Highest Rated' },
  { value: 'release_date.desc', label: 'Newest First' },
  { value: 'revenue.desc', label: 'Box Office' },
];

export default function Home() {
  // Hero / rows
  const [trending, setTrending] = useState([]);
  const [nowPlaying, setNowPlaying] = useState([]);
  const [topRated, setTopRated] = useState([]);
  const [trendingTV, setTrendingTV] = useState([]);
  const [anime, setAnime] = useState([]);

  // Genre browser
  const [genres, setGenres] = useState([]);
  const [activeGenre, setActiveGenre] = useState(null); // null = All
  const [sortBy, setSortBy] = useState('popularity.desc');
  const [browseMovies, setBrowseMovies] = useState([]);
  const [browsePage, setBrowsePage] = useState(1);
  const [browseTotalPages, setBrowseTotalPages] = useState(null);
  const [browseLoading, setBrowseLoading] = useState(false);

  const [addingId, setAddingId] = useState(null);
  const [rowsLoading, setRowsLoading] = useState(true);

  const { addToast } = useToast();
  const navigate = useNavigate();

  // Load hero + rows on mount
  useEffect(() => {
    loadRows();
  }, []);

  // Reload browse grid when genre/sort/page changes
  useEffect(() => {
    loadBrowse();
  }, [activeGenre, sortBy, browsePage]);

  const loadRows = async () => {
    setRowsLoading(true);
    try {
      const [trendRes, nowRes, topRes, tvRes, animeRes, genreRes] = await Promise.allSettled([
        movieService.getTrending(),
        movieService.getNowPlaying(),
        movieService.getTopRated(),
        tvService.getTrending(),
        tvService.getAnime(),
        movieService.getGenres(),
      ]);

      if (trendRes.status === 'fulfilled') {
        const t = trendRes.value.data;
        setTrending(t);
      }
      if (nowRes.status === 'fulfilled') setNowPlaying(nowRes.value.data);
      if (topRes.status === 'fulfilled') setTopRated(topRes.value.data.results || topRes.value.data);
      if (tvRes.status === 'fulfilled') setTrendingTV(tvRes.value.data);
      if (animeRes.status === 'fulfilled') setAnime(animeRes.value.data.results || animeRes.value.data);
      if (genreRes.status === 'fulfilled') setGenres(genreRes.value.data);
    } catch (err) {
      addToast('Failed to load some content', 'error');
    } finally {
      setRowsLoading(false);
    }
  };

  const loadBrowse = async () => {
    setBrowseLoading(true);
    try {
      let res;
      if (activeGenre === null) {
        res = await movieService.getPopular(browsePage);
        setBrowseMovies(res.data.results);
        setBrowseTotalPages(res.data.total_pages);
      } else {
        res = await movieService.discover(browsePage, activeGenre);
        setBrowseMovies(res.data.results);
        setBrowseTotalPages(res.data.total_pages);
      }
    } catch (err) {
      addToast('Failed to load movies', 'error');
    } finally {
      setBrowseLoading(false);
    }
  };

  const handleGenreChange = (genreId) => {
    setActiveGenre(genreId);
    setBrowsePage(1);
  };

  const handleSortChange = (val) => {
    setSortBy(val);
    setBrowsePage(1);
  };

  const handleAddToWatchlist = async (movie) => {
    setAddingId(movie.id);
    try {
      await watchlistService.addMovie(
        movie.id,
        movie.title || movie.name,
        movie.overview,
        movie.poster_path,
        movie.release_date,
        movie.vote_average
      );
      addToast(`"${movie.title || movie.name}" added to watchlist`, 'success');
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

  const maxBrowsePage = browseTotalPages ? Math.min(browseTotalPages, 500) : 500;

  return (
    <div className="home">
      {/* Hero Banner */}
      {!rowsLoading && trending.length > 0 && <HeroBanner items={trending} onAddToWatchlist={handleAddToWatchlist} />}
      {rowsLoading && <div className="hero-skeleton" />}

      {/* Category Rows */}
      {rowsLoading ? (
        <div className="rows-skeleton">
          {[1, 2, 3].map((i) => (
            <div key={i} className="row-skeleton-block">
              <div className="row-skeleton-title" />
              <div className="row-skeleton-cards">
                {Array.from({ length: 7 }).map((_, j) => (
                  <div key={j} className="row-skeleton-card" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <MediaRow title="Trending this week" items={trending} mediaType="movie" seeAllTo="/browse/trending-movies" />
          <MediaRow title="In theaters now" items={nowPlaying} mediaType="movie" seeAllTo="/browse/now-playing" />
          <MediaRow title="Top rated of all time" items={topRated} mediaType="movie" seeAllTo="/browse/top-rated-movies" />
          <MediaRow title="Trending series" items={trendingTV} mediaType="tv" seeAllTo="/browse/trending-tv" />
          <MediaRow title="Popular anime" items={anime} mediaType="anime" seeAllTo="/browse/anime" />
        </>
      )}

      {/* Browse Section */}
      <div className="browse-section">
        <div className="browse-header">
          <h2 className="browse-title">Browse movies</h2>
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

        {/* Genre filter pills */}
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

        {/* Movie grid */}
        {browseLoading ? (
          <div className="loading-grid">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="skeleton-card" />
            ))}
          </div>
        ) : (
          <div className="movies-grid">
            {browseMovies.map((movie) => (
              <MovieCard
                key={movie.id}
                movie={movie}
                onAddToWatchlist={() => handleAddToWatchlist(movie)}
                showAddButton={addingId !== movie.id}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        <div className="pagination">
          <button
            onClick={() => setBrowsePage((p) => Math.max(1, p - 1))}
            disabled={browsePage === 1 || browseLoading}
          >
            <Icon name="left" size={16} /> Previous
          </button>
          <span>Page {browsePage}{browseTotalPages ? ` of ${maxBrowsePage}` : ''}</span>
          <button
            onClick={() => setBrowsePage((p) => Math.min(maxBrowsePage, p + 1))}
            disabled={browsePage >= maxBrowsePage || browseLoading}
          >
            Next <Icon name="right" size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
