import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from './Icon';
import '../styles/MediaRow.css';

function scoreClass(n) {
  return n >= 7 ? 'is-high' : n >= 5 ? 'is-mid' : 'is-low';
}

export default function MediaRow({ title, items, mediaType = 'movie', seeAllTo = null }) {
  const rowRef = useRef(null);
  const navigate = useNavigate();
  const [edges, setEdges] = useState({ start: true, end: false });

  const updateEdges = useCallback(() => {
    const el = rowRef.current;
    if (!el) return;
    setEdges({
      start: el.scrollLeft <= 4,
      end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4,
    });
  }, []);

  useEffect(() => {
    updateEdges();
    window.addEventListener('resize', updateEdges);
    return () => window.removeEventListener('resize', updateEdges);
  }, [items, updateEdges]);

  const scroll = (dir) => {
    const el = rowRef.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: 'smooth' });
  };

  const open = (item) => {
    navigate(mediaType === 'movie' ? `/watch/${item.id}` : `/watch/${item.id}?type=tv`);
  };

  if (!items || items.length === 0) return null;

  return (
    <section className="media-row" aria-label={title}>
      <div className="mr-header">
        <h2 className="mr-title">
          {seeAllTo ? <Link to={seeAllTo}>{title}</Link> : title}
        </h2>
        {seeAllTo && (
          <Link to={seeAllTo} className="mr-see-all">
            See all <Icon name="right" size={16} />
          </Link>
        )}
      </div>

      <div className="mr-viewport">
        {!edges.start && (
          <button className="mr-arrow mr-arrow--left" onClick={() => scroll(-1)} aria-label={`Scroll ${title} left`}>
            <Icon name="left" size={22} />
          </button>
        )}
        <div className="mr-track" ref={rowRef} onScroll={updateEdges}>
          {items.map((item) => {
            const name = item.title || item.name || 'Untitled';
            const year = (item.release_date || item.first_air_date)?.substring(0, 4);
            const raw = item.rating ?? item.vote_average;
            const score = raw ? raw.toFixed(1) : null;
            return (
              <button key={item.id} className="mr-card" onClick={() => open(item)} title={name}>
                <div className="mr-card-poster">
                  {item.poster_path
                    ? <img src={`https://image.tmdb.org/t/p/w342${item.poster_path}`} alt="" loading="lazy" />
                    : <div className="mr-no-poster">{name}</div>}
                  {score && score !== '0.0' && (
                    <span className={`mr-score ${scoreClass(raw)}`}>
                      <Icon name="star" size={11} /> {score}
                    </span>
                  )}
                  {mediaType === 'anime' && <span className="mr-type">Anime</span>}
                  {mediaType === 'tv' && <span className="mr-type">Series</span>}
                  <span className="mr-play"><Icon name="play" size={22} /></span>
                </div>
                <span className="mr-card-title">{name}</span>
                {year && <span className="mr-card-year">{year}</span>}
              </button>
            );
          })}
          {seeAllTo && (
            <Link to={seeAllTo} className="mr-card mr-card--more">
              <span className="mr-more-inner">
                <Icon name="right" size={26} />
                See all
              </span>
            </Link>
          )}
        </div>
        {!edges.end && (
          <button className="mr-arrow mr-arrow--right" onClick={() => scroll(1)} aria-label={`Scroll ${title} right`}>
            <Icon name="right" size={22} />
          </button>
        )}
      </div>
    </section>
  );
}
