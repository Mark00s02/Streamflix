import React from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from './Icon';
import '../styles/MovieCard.css';

function scoreClass(n) {
  return n >= 7 ? 'is-high' : n >= 5 ? 'is-mid' : 'is-low';
}

export default function MovieCard({ movie, onAddToWatchlist, showAddButton = true, mediaType = 'movie' }) {
  const navigate = useNavigate();

  const title = movie.title || movie.name || 'Untitled';
  const year = (movie.release_date || movie.first_air_date)?.substring(0, 4);
  const raw = movie.rating ?? movie.vote_average;
  const score = raw ? Number(raw).toFixed(1) : null;
  const isSeries = mediaType === 'tv' || mediaType === 'anime';

  const handleWatch = () => navigate(isSeries ? `/watch/${movie.id}?type=tv` : `/watch/${movie.id}`);

  return (
    <article className="movie-card">
      <button className="movie-poster-wrap" onClick={handleWatch} aria-label={`Watch ${title}`}>
        {movie.poster_path ? (
          <img src={`https://image.tmdb.org/t/p/w342${movie.poster_path}`} alt="" className="movie-poster" loading="lazy" />
        ) : (
          <span className="movie-poster-placeholder">{title}</span>
        )}
        {score && score !== '0.0' && (
          <span className={`card-score ${scoreClass(raw)}`}>
            <Icon name="star" size={11} /> {score}
          </span>
        )}
        {mediaType === 'anime' && <span className="card-type">Anime</span>}
        {mediaType === 'tv' && <span className="card-type">Series</span>}
        <span className="poster-play"><Icon name="play" size={22} /></span>
      </button>

      <div className="movie-info">
        <h3 className="movie-title-link" title={title} onClick={handleWatch}>{title}</h3>
        <div className="movie-info-row">
          {year && <span className="year">{year}</span>}
          {showAddButton && onAddToWatchlist && (
            <button onClick={onAddToWatchlist} className="add-btn" aria-label={`Add ${title} to watchlist`} title="Add to watchlist">
              <Icon name="plus" size={16} />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
