import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/Header.css';

export default function Header() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMenuOpen(false);
  };

  const isActive = (path) => location.pathname === path ? 'active' : '';

  return (
    <header className="site-header">
      <div className="header-container">
        <Link to="/" className="logo" onClick={() => setMenuOpen(false)}>
          <span className="logo-icon">▶</span>
          StreamFlix
        </Link>

        <nav className={`nav ${menuOpen ? 'nav-open' : ''}`}>
          <Link to="/" className={isActive('/')} onClick={() => setMenuOpen(false)}>Home</Link>
          <Link to="/movies" className={isActive('/movies')} onClick={() => setMenuOpen(false)}>Movies</Link>
          <Link to="/anime" className={`nav-anime ${isActive('/anime')}`} onClick={() => setMenuOpen(false)}>Anime</Link>
          <Link to="/asiandrama" className={`nav-asiandrama ${isActive('/asiandrama')}`} onClick={() => setMenuOpen(false)}>Asian Drama</Link>
          <Link to="/shortdramas" className={`nav-dramas ${isActive('/shortdramas')}`} onClick={() => setMenuOpen(false)}>Short Dramas</Link>
          <Link to="/search" className={isActive('/search')} onClick={() => setMenuOpen(false)}>Search</Link>
          {isAuthenticated && (
            <Link to="/watchlist" className={isActive('/watchlist')} onClick={() => setMenuOpen(false)}>Watchlist</Link>
          )}
        </nav>

        <div className="auth-section">
          {isAuthenticated ? (
            <div className="user-menu">
              <span className="username">Hi, {user?.username}</span>
              <button onClick={handleLogout} className="logout-btn">Logout</button>
            </div>
          ) : (
            <>
              <Link to="/login" className="login-btn" onClick={() => setMenuOpen(false)}>Login</Link>
              <Link to="/register" className="register-btn" onClick={() => setMenuOpen(false)}>Register</Link>
            </>
          )}
        </div>

        <button
          className="hamburger"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>
    </header>
  );
}
