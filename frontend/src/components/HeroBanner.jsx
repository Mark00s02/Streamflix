import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from './Icon';
import '../styles/HeroBanner.css';

const ROTATE_MS = 9000;

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

// Full-bleed featured title. With several `items`, a picker along the bottom
// lets the viewer switch, and it advances on its own unless motion is reduced.
export default function HeroBanner({ items = [], onAddToWatchlist }) {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timer = useRef(null);
  const featured = items.filter((m) => m.backdrop_path).slice(0, 5);
  const movie = featured[index] || featured[0];

  useEffect(() => {
    if (featured.length < 2 || paused || prefersReducedMotion()) return;
    timer.current = setTimeout(() => setIndex((i) => (i + 1) % featured.length), ROTATE_MS);
    return () => clearTimeout(timer.current);
  }, [index, paused, featured.length]);

  if (!movie) return null;

  const title = movie.title || movie.name;
  const year = (movie.release_date || movie.first_air_date)?.substring(0, 4);
  const score = movie.vote_average ? movie.vote_average.toFixed(1) : null;
  const overview = movie.overview && movie.overview.length > 240
    ? `${movie.overview.slice(0, 240).trimEnd()}…`
    : movie.overview;

  const watch = () => navigate(`/watch/${movie.id}`);

  return (
    <section
      className="hero"
      aria-roledescription="carousel"
      aria-label="Featured this week"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {featured.map((m, i) => (
        <div
          key={m.id}
          className={`hero-backdrop ${i === index ? 'is-active' : ''}`}
          style={{ backgroundImage: `url(https://image.tmdb.org/t/p/original${m.backdrop_path})` }}
          aria-hidden="true"
        />
      ))}
      <div className="hero-shade" aria-hidden="true" />

      <div className="hero-content" key={movie.id}>
        <p className="hero-kicker">
          <Icon name="flame" size={16} /> Trending this week
        </p>
        <h1 className="hero-title">{title}</h1>
        <div className="hero-facts">
          {score && <span className="hero-score"><Icon name="star" size={14} /> {score}</span>}
          {year && <span>{year}</span>}
          {movie.vote_count > 0 && <span>{movie.vote_count.toLocaleString()} ratings</span>}
        </div>
        {overview && <p className="hero-overview">{overview}</p>}
        <div className="hero-actions">
          <button className="btn btn-primary btn-lg" onClick={watch}>
            <Icon name="play" size={18} /> Watch now
          </button>
          {onAddToWatchlist && (
            <button className="btn btn-glass btn-lg" onClick={() => onAddToWatchlist(movie)}>
              <Icon name="plus" size={18} /> Watchlist
            </button>
          )}
        </div>
      </div>

      {featured.length > 1 && (
        <div className="hero-picker" role="tablist" aria-label="Featured titles">
          {featured.map((m, i) => (
            <button
              key={m.id}
              role="tab"
              aria-selected={i === index}
              className={`hero-pick ${i === index ? 'is-active' : ''}`}
              onClick={() => setIndex(i)}
              title={m.title || m.name}
            >
              <img src={`https://image.tmdb.org/t/p/w300${m.backdrop_path}`} alt="" loading="lazy" />
              <span className="hero-pick-title">{m.title || m.name}</span>
              {i === index && !paused && <span className="hero-pick-progress" style={{ animationDuration: `${ROTATE_MS}ms` }} />}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
