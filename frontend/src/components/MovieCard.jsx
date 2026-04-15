import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/MovieCard.css';

function ScoreBadge({ score }) {
  if (!score || score === '0.0') return null;
  const n = parseFloat(score);
  const cls = n >= 7 ? 'sb-green' : n >= 5 ? 'sb-yellow' : 'sb-red';
  return (
    <div className={`score-badge ${cls}`} title={`TMDB Score: ${score}/10`}>
      <span className="sb-num">{score}</span>
      <span className="sb-label">TMDB</span>
    </div>
  );
}

export default function MovieCard({ movie, onAddToWatchlist, showAddButton = true, mediaType = 'movie' }) {
  const navigate = useNavigate();

  const posterUrl = movie.poster_path
    ? `https://image.tmdb.org/t/p/w342${movie.poster_path}`
    : null;

  const title = movie.title || movie.name || 'Untitled';
  const year = (movie.release_date || movie.first_air_date)?.substring(0, 4);
  const score = (movie.rating ?? movie.vote_average)?.toFixed(1);

  const handleWatch = () => {
    if (mediaType === 'tv' || mediaType === 'anime') {
      navigate(`/watch/${movie.id}?type=tv`);
    } else {
      navigate(`/watch/${movie.id}`);
    }
  };

  return (
    <div className="movie-card">
      <div className="movie-poster-wrap" onClick={handleWatch}>
        {posterUrl ? (
          <img src={posterUrl} alt={title} className="movie-poster" loading="lazy" />
        ) : (
          <div className="movie-poster-placeholder">
            <span>No Image</span>
          </div>
        )}
        <ScoreBadge score={score} />
        {mediaType === 'anime' && <span className="card-type-badge anime">ANIME</span>}
        {mediaType === 'tv' && <span className="card-type-badge tv">TV</span>}
        <div className="poster-hover-overlay">
          <span className="watch-icon">▶</span>
        </div>
      </div>

      <div className="movie-info">
        <h3 title={title} onClick={handleWatch} className="movie-title-link">
          {title}
        </h3>
        {year && <p className="year">{year}</p>}
        {movie.overview && (
          <p className="overview">
            {movie.overview.substring(0, 110)}{movie.overview.length > 110 ? '…' : ''}
          </p>
        )}
        <div className="card-actions">
          <button onClick={handleWatch} className="watch-btn">▶ Watch</button>
          {showAddButton && (
            <button onClick={onAddToWatchlist} className="add-btn" title="Add to watchlist">
              +
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
