import React, { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import Icon, { LogoMark } from './Icon';
import '../styles/Header.css';

const NAV = [
  { to: '/',            label: 'Home', end: true },
  { to: '/movies',      label: 'Movies' },
  { to: '/anime',       label: 'Anime' },
  { to: '/asiandrama',  label: 'Asian drama' },
  { to: '/shortdramas', label: 'Short dramas' },
  { to: '/watchlist',   label: 'Watchlist' },
];

// The search box searches whichever section you're in
export function searchScopeFor(pathname, search = '') {
  if (pathname.startsWith('/search')) return new URLSearchParams(search).get('scope') || 'all';
  if (pathname.startsWith('/anime') || pathname === '/browse/anime' || pathname === '/browse/top-rated-anime') return 'anime';
  if (pathname.startsWith('/asiandrama') || /^\/browse\/(k|j|c|tw|thai|pinoy|vn)drama|^\/browse\/(bl|gl)$/.test(pathname)) return 'drama';
  if (pathname.startsWith('/shortdramas')) return 'short';
  if (pathname.startsWith('/movies')) return 'movies';
  return 'all';
}

const PLACEHOLDER = {
  all: 'Search movies and series',
  movies: 'Search movies',
  anime: 'Search anime',
  drama: 'Search Asian dramas',
  short: 'Search short dramas',
};

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [term, setTerm] = useState('');
  const inputRef = useRef(null);
  const scope = searchScopeFor(location.pathname, location.search);

  // Transparent over the hero, glass once the page scrolls
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close menus and return to the top on navigation
  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    if (searchOpen) inputRef.current?.focus();
  }, [searchOpen]);

  const submitSearch = (e) => {
    e.preventDefault();
    const q = term.trim();
    if (!q) return;
    if (scope === 'short') navigate(`/shortdramas?q=${encodeURIComponent(q)}`);
    else navigate(`/search?scope=${scope}&q=${encodeURIComponent(q)}`);
    setSearchOpen(false);
    setTerm('');
  };

  return (
    <header className={`site-header ${scrolled || menuOpen || searchOpen ? 'is-solid' : ''}`}>
      <div className="header-container">
        <Link to="/" className="logo" aria-label="StreamFlix home">
          <LogoMark size={30} />
          <span className="logo-word">StreamFlix</span>
        </Link>

        <nav className={`nav ${menuOpen ? 'nav-open' : ''}`} aria-label="Main">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => (isActive ? 'active' : '')}>
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="header-actions">
          <form className={`header-search ${searchOpen ? 'is-open' : ''}`} onSubmit={submitSearch} role="search">
            <input
              ref={inputRef}
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Escape') setSearchOpen(false); }}
              placeholder={PLACEHOLDER[scope]}
              aria-label={PLACEHOLDER[scope]}
              tabIndex={searchOpen ? 0 : -1}
            />
            <button
              type={searchOpen && term.trim() ? 'submit' : 'button'}
              className="icon-btn"
              onClick={() => { if (!searchOpen) setSearchOpen(true); else if (!term.trim()) setSearchOpen(false); }}
              aria-label={searchOpen ? 'Search' : 'Open search'}
            >
              <Icon name={searchOpen && !term.trim() ? 'close' : 'search'} size={20} />
            </button>
          </form>
          <button
            className="icon-btn hamburger"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            <Icon name={menuOpen ? 'close' : 'menu'} size={22} />
          </button>
        </div>
      </div>
    </header>
  );
}
