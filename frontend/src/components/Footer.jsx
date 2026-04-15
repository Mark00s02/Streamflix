import React from 'react';
import '../styles/Footer.css';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <span className="footer-logo">▶ StreamFlix</span>
        <span className="footer-divider">·</span>
        <span className="footer-credit">
          Made by <span className="footer-handle">@Mark00s</span>
        </span>
        <span className="footer-divider">·</span>
        <span className="footer-note">Powered by TMDB</span>
      </div>
    </footer>
  );
}
