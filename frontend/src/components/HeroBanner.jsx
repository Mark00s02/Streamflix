import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/HeroBanner.css';

function ScoreRing({ score }) {
  if (!score || score === '0.0') return null;
  const n = parseFloat(score);
  const pct = Math.round(n * 10);
  const cls = n >= 7 ? 'ring-green' : n >= 5 ? 'ring-yellow' : 'ring-red';
  const circumference = 2 * Math.PI * 18; // r=18
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className={`score-ring ${cls}`} title={`TMDB Score: ${score}/10`}>
      <svg viewBox="0 0 44 44" width="54" height="54">
        <circle cx="22" cy="22" r="18" stroke="rgba(255,255,255,0.15)" strokeWidth="3" fill="none" />
        <circle
          cx="22" cy="22" r="18"
          stroke="currentColor"
          strokeWidth="3"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 22 22)"
        />
      </svg>
      <div className="ring-text">
        <span className="ring-pct">{pct}<sup>%</sup></span>
      </div>
      <div className="ring-label">TMDB</div>
    </div>
  );
}

export default function HeroBanner({ movie }) {
  const navigate = useNavigate();
  if (!movie) return null;

  const backdropUrl = movie.backdrop_path
    ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}`
    : null;

  const score = (movie.rating ?? movie.vote_average)?.toFixed(1);
  const year = (movie.release_date || movie.first_air_date)?.substring(0, 4);
  const title = movie.title || movie.name;
  const overview = movie.overview?.substring(0, 220);
  const genreNames = movie.genre_ids
    ? []
    : movie.genres?.slice(0, 3).map((g) => g.name) || [];

  const handleWatch = () => navigate(`/watch/${movie.id}`);
  const handleMore = () => navigate(`/watch/${movie.id}`);

  return (
    <div
      className="hero-banner"
      style={backdropUrl ? { backgroundImage: `url(${backdropUrl})` } : {}}
    >
      <div className="hero-gradient" />
      <div className="hero-content">
        <div className="hero-badges">
          <span className="hero-badge trending-badge">🔥 Trending</span>
          {year && <span className="hero-badge year-badge">{year}</span>}
        </div>

        <h1 className="hero-title">{title}</h1>

        {genreNames.length > 0 && (
          <div className="hero-genres">
            {genreNames.map((g) => (
              <span key={g} className="hero-genre-pill">{g}</span>
            ))}
          </div>
        )}

        {overview && <p className="hero-overview">{overview}{movie.overview?.length > 220 ? '…' : ''}</p>}

        <div className="hero-meta">
          <ScoreRing score={score} />
          {movie.vote_count > 0 && (
            <span className="hero-votes">{movie.vote_count.toLocaleString()} ratings</span>
          )}
        </div>

        <div className="hero-actions">
          <button className="hero-play-btn" onClick={handleWatch}>
            ▶ Watch Now
          </button>
          <button className="hero-info-btn" onClick={handleMore}>
            ℹ More Info
          </button>
        </div>
      </div>
    </div>
  );
}
