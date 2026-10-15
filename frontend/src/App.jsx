import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Movies from './pages/Movies';
import Anime from './pages/Anime';
import AsianDrama from './pages/AsianDrama';
import ShortDramas from './pages/ShortDramas';
import Search from './pages/Search';
import Watch from './pages/Watch';
import Watchlist from './pages/Watchlist';
import SeeAll from './pages/SeeAll';
import './styles/App.css';

// The vertical player pulls in hls.js, so load it only when it's opened
const ShortDramaWatch = lazy(() => import('./pages/ShortDramaWatch'));

function AppRoutes() {
  return (
    <Router>
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/movies" element={<Movies />} />
          <Route path="/anime" element={<Anime />} />
          <Route path="/asiandrama" element={<AsianDrama />} />
          <Route path="/shortdramas" element={<ShortDramas />} />
          <Route path="/shortdramas/:provider/:id" element={<Suspense fallback={<div className="empty-state"><div className="spinner" /></div>}><ShortDramaWatch /></Suspense>} />
          <Route path="/browse/:category" element={<SeeAll />} />
          <Route path="/search" element={<Search />} />
          <Route path="/watch/:id" element={<Watch />} />
          <Route path="/watchlist" element={<Watchlist />} />
          {/* Accounts were removed; send old links home */}
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/register" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </Router>
  );
}

function App() {
  return (
    <ToastProvider>
      <AppRoutes />
    </ToastProvider>
  );
}

export default App;
