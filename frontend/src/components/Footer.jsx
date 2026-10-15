import React from 'react';
import { Link } from 'react-router-dom';
import { LogoMark } from './Icon';
import '../styles/Footer.css';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <Link to="/" className="footer-logo">
          <LogoMark size={22} /> StreamFlix
        </Link>
        <p className="footer-note">
          Made by <span className="footer-handle">@Mark00s</span>. Title data from TMDB.
        </p>
      </div>
    </footer>
  );
}
