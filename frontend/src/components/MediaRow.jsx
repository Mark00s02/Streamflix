import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/MediaRow.css';

function ScoreBadge({ score }) {
  if (!score || score === '0.0') return null;
  const n = parseFloat(score);
  const cls = n >= 7 ? 'score-green' : n >= 5 ? 'score-yellow' : 'score-red';
  return (
    <div className={`row-score-badge ${cls}`}>
      <span className="rsb-num">{score}</span>
      <span className="rsb-label">TMDB</span>
    </div>
  );
}

export default function MediaRow({ title, items, mediaType = 'movie', badge = null, onAddToWatchlist }) {
  const rowRef = useRef(null);
  const navigate = useNavigate();

  const scroll = (dir) => {
    if (rowRef.current) {
      rowRef.current.scrollBy({ left: dir * 700, behavior: 'smooth' });
    }
  };

  const handleClick = (item) => {
    if (mediaType === 'tv' || mediaType === 'anime') {
      navigate(`/watch/${item.id}?type=tv`);
    } else {
      navigate(`/watch/${item.id}`);
    }
  };

  const getPosterUrl = (item) =>
    item.poster_path ? `https://image.tmdb.org/t/p/w342${item.poster_path}` : null;

  const getTitle = (item) => item.title || item.name || 'Untitled';
  const getYear = (item) => {
    const d = item.release_date || item.first_air_date;
    return d?.substring(0, 4);
  };
  const getScore = (item) => {
    const s = item.rating ?? item.vote_average;
    return s ? s.toFixed(1) : null;
  };

  if (!items || items.length === 0) return null;

  return (
    <section className="media-row">
      <div className="mr-header">
        <h2 className="mr-title">
          {badge && <span className={`mr-badge mr-badge--${badge}`}>{badge}</span>}
          {title}
        </h2>
        <div className="mr-controls">
          <button className="mr-scroll-btn" onClick={() => scroll(-1)} aria-label="Scroll left">‹</button>
          <button className="mr-scroll-btn" onClick={() => scroll(1)} aria-label="Scroll right">›</button>
        </div>
      </div>

      <div className="mr-track" ref={rowRef}>
        {items.map((item) => {
          const posterUrl = getPosterUrl(item);
          const title = getTitle(item);
          const year = getYear(item);
          const score = getScore(item);

          return (
            <div
              key={item.id}
              className="mr-card"
              onClick={() => handleClick(item)}
              title={title}
            >
              <div className="mr-card-poster">
                {posterUrl ? (
                  <img src={posterUrl} alt={title} loading="lazy" />
                ) : (
                  <div className="mr-no-poster">No Image</div>
                )}
                <ScoreBadge score={score} />
                {(mediaType === 'anime') && <span className="mr-type-badge anime">ANIME</span>}
                {(mediaType === 'tv') && <span className="mr-type-badge tv">TV</span>}
                <div className="mr-hover-overlay">
                  <span className="mr-play-icon">▶</span>
                </div>
              </div>
              <div className="mr-card-info">
                <p className="mr-card-title">{title}</p>
                {year && <p className="mr-card-year">{year}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
