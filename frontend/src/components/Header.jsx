import React, { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Icon, { LogoMark } from './Icon';
import '../styles/Header.css';

const NAV = [
  { to: '/',            label: 'Home', end: true },
  { to: '/movies',      label: 'Movies' },
  { to: '/anime',       label: 'Anime' },
  { to: '/asiandrama',  label: 'Asian drama' },
  { to: '/shortdramas', label: 'Short dramas' },
];

export default function Header() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Transparent over the hero, glass once the page scrolls
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the mobile menu and return to the top on navigation
  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className={`site-header ${scrolled || menuOpen ? 'is-solid' : ''}`}>
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
          {isAuthenticated && (
            <NavLink to="/watchlist" className={({ isActive }) => (isActive ? 'active' : '')}>Watchlist</NavLink>
          )}
          <div className="nav-auth-mobile">
            {isAuthenticated ? (
              <button onClick={handleLogout} className="btn btn-ghost"><Icon name="logout" /> Sign out</button>
            ) : (
              <>
                <Link to="/login" className="btn btn-ghost">Sign in</Link>
                <Link to="/register" className="btn btn-primary">Create account</Link>
              </>
            )}
          </div>
        </nav>

        <div className="header-actions">
          <Link to="/search" className="icon-btn" aria-label="Search">
            <Icon name="search" size={20} />
          </Link>
          <div className="auth-section">
            {isAuthenticated ? (
              <div className="user-menu">
                <span className="user-chip" title={user?.email}>
                  <span className="user-avatar">{(user?.username || '?').charAt(0).toUpperCase()}</span>
                  <span className="username">{user?.username}</span>
                </span>
                <button onClick={handleLogout} className="icon-btn" aria-label="Sign out" title="Sign out">
                  <Icon name="logout" size={19} />
                </button>
              </div>
            ) : (
              <>
                <Link to="/login" className="btn btn-quiet">Sign in</Link>
                <Link to="/register" className="btn btn-primary">Create account</Link>
              </>
            )}
          </div>
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
