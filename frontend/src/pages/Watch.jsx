import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { movieService, tvService, watchlistService } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import '../styles/Watch.css';

// ── Embed sources ──────────────────────────────────────────────
const SOURCES = [
  { id: 'vidlink',    label: 'VidLink',    hint: 'Recommended' },
  { id: 'vidsrc',     label: 'VidSrc',     hint: '' },
  { id: 'autoembed',  label: 'AutoEmbed',  hint: '' },
  { id: 'multiembed', label: 'MultiEmbed', hint: '' },
  { id: 'moviesapi',  label: 'MoviesAPI',  hint: '' },
];

function getEmbedUrl(source, mediaType, id, season, episode) {
  const s = season  || 1;
  const e = episode || 1;
  if (mediaType === 'movie') {
    switch (source) {
      case 'vidlink':    return `https://vidlink.pro/movie/${id}`;
      case 'vidsrc':     return `https://vidsrc.xyz/embed/movie/${id}`;
      case 'autoembed':  return `https://player.autoembed.cc/embed/movie/${id}`;
      case 'multiembed': return `https://multiembed.mov/?video_id=${id}&tmdb=1`;
      case 'moviesapi':  return `https://moviesapi.club/movie/${id}`;
      default:           return `https://vidlink.pro/movie/${id}`;
    }
  } else {
    switch (source) {
      case 'vidlink':    return `https://vidlink.pro/tv/${id}/${s}/${e}`;
      case 'vidsrc':     return `https://vidsrc.xyz/embed/tv/${id}/${s}/${e}`;
      case 'autoembed':  return `https://player.autoembed.cc/embed/tv/${id}/${s}/${e}`;
      case 'multiembed': return `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${s}&e=${e}`;
      case 'moviesapi':  return `https://moviesapi.club/tv/${id}-${s}-${e}`;
      default:           return `https://vidlink.pro/tv/${id}/${s}/${e}`;
    }
  }
}

// ── Score badge ────────────────────────────────────────────────
function ScoreBadge({ score }) {
  if (!score || score === '0.0') return null;
  const n = parseFloat(score);
  const cls = n >= 7 ? 'wsb-green' : n >= 5 ? 'wsb-yellow' : 'wsb-red';
  return (
    <div className={`watch-score-badge ${cls}`}>
      <span className="wsb-pct">{Math.round(n * 10)}%</span>
      <span className="wsb-label">TMDB Score</span>
    </div>
  );
}

// ── Episode card ───────────────────────────────────────────────
function EpisodeCard({ ep, isActive, onClick }) {
  const stillUrl   = ep.still_path ? `https://image.tmdb.org/t/p/w300${ep.still_path}` : null;
  const score      = ep.vote_average?.toFixed(1);
  const scoreN     = parseFloat(score);
  const scoreColor = scoreN >= 7 ? '#4caf50' : scoreN >= 5 ? '#ffb300' : '#f44336';

  return (
    <div className={`ep-card ${isActive ? 'ep-card--active' : ''}`} onClick={onClick}>
      <div className="ep-still">
        {stillUrl
          ? <img src={stillUrl} alt={ep.name} loading="lazy" />
          : <div className="ep-still-placeholder">No Preview</div>}
        {isActive && <div className="ep-playing-badge">▶ Playing</div>}
        {ep.runtime && <span className="ep-runtime">{ep.runtime}m</span>}
      </div>
      <div className="ep-info">
        <div className="ep-header">
          <span className="ep-number">E{ep.episode_number}</span>
          {score && score !== '0.0' && (
            <span className="ep-score" style={{ color: scoreColor }}>★ {score}</span>
          )}
        </div>
        <p className="ep-title">{ep.name}</p>
        {ep.air_date && (
          <p className="ep-airdate">
            {new Date(ep.air_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
          </p>
        )}
        {ep.overview && (
          <p className="ep-overview">{ep.overview.substring(0, 130)}{ep.overview.length > 130 ? '…' : ''}</p>
        )}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────
export default function Watch() {
  const { id }         = useParams();
  const [searchParams] = useSearchParams();
  const mediaType      = searchParams.get('type') === 'tv' ? 'tv' : 'movie';

  const [media,           setMedia]           = useState(null);
  const [loading,         setLoading]         = useState(true);
  const [playerReady,     setPlayerReady]     = useState(false);
  const [selectedSeason,  setSelectedSeason]  = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState(1);
  const [episodes,        setEpisodes]        = useState([]);
  const [epLoading,       setEpLoading]       = useState(false);
  const [seasons,         setSeasons]         = useState([]);
  const [source,          setSource]          = useState('vidlink');

  // 'none' | 'css' | 'document'
  const [pipMode,   setPipMode]   = useState('none');
  const [adShield,  setAdShield]  = useState(true); // on by default

  const { isAuthenticated } = useAuth();
  const { addToast }        = useToast();
  const navigate            = useNavigate();

  // CSS-pip drag refs (direct DOM mutations — no React re-renders during drag)
  const cssPipRef = useRef(null);
  const dragData  = useRef({ active: false, startX: 0, startY: 0, origLeft: 0, origTop: 0 });
  // Document-pip window ref
  const docPipWin = useRef(null);

  // ── CSS-pip drag ─────────────────────────────────────────────
  const onDragMove = useCallback((e) => {
    if (!dragData.current.active || !cssPipRef.current) return;
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    const newL = Math.max(0, Math.min(window.innerWidth  - cssPipRef.current.offsetWidth,  dragData.current.origLeft + cx - dragData.current.startX));
    const newT = Math.max(0, Math.min(window.innerHeight - cssPipRef.current.offsetHeight, dragData.current.origTop  + cy - dragData.current.startY));
    cssPipRef.current.style.left   = newL + 'px';
    cssPipRef.current.style.top    = newT + 'px';
    cssPipRef.current.style.right  = 'auto';
    cssPipRef.current.style.bottom = 'auto';
  }, []);

  const onDragEnd = useCallback(() => {
    dragData.current.active = false;
    window.removeEventListener('mousemove', onDragMove);
    window.removeEventListener('mouseup',   onDragEnd);
    window.removeEventListener('touchmove', onDragMove);
    window.removeEventListener('touchend',  onDragEnd);
  }, [onDragMove]);

  const onDragStart = useCallback((e) => {
    if (!cssPipRef.current) return;
    e.preventDefault();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    const rect = cssPipRef.current.getBoundingClientRect();
    dragData.current = { active: true, startX: cx, startY: cy, origLeft: rect.left, origTop: rect.top };
    cssPipRef.current.style.left   = rect.left + 'px';
    cssPipRef.current.style.top    = rect.top  + 'px';
    cssPipRef.current.style.right  = 'auto';
    cssPipRef.current.style.bottom = 'auto';
    window.addEventListener('mousemove', onDragMove);
    window.addEventListener('mouseup',   onDragEnd);
    window.addEventListener('touchmove', onDragMove, { passive: false });
    window.addEventListener('touchend',  onDragEnd);
  }, [onDragMove, onDragEnd]);

  // ── Ad Shield ────────────────────────────────────────────────
  // Detects popup ads: clicking iframe controls normally doesn't hide the
  // document, but an ad opening a new tab DOES (document.hidden → true).
  // When that happens we immediately pull focus back.
  useEffect(() => {
    if (!playerReady || !adShield) return;

    let cooldown = false;

    const onBlur = () => {
      // Small delay to let document.hidden settle after the tab switch
      setTimeout(() => {
        if (!document.hidden) return; // normal iframe focus — ignore
        // A new tab / popup stole focus → yank it back
        window.focus();
        if (!cooldown) {
          cooldown = true;
          addToast('🛡 Ad popup blocked — pulled you back', 'warning');
          setTimeout(() => { cooldown = false; }, 4000);
        }
      }, 150);
    };

    window.addEventListener('blur', onBlur);
    return () => window.removeEventListener('blur', onBlur);
  }, [playerReady, adShield, addToast]);

  // ── PiP enter / exit ─────────────────────────────────────────
  const enterPip = useCallback(async (currentEmbedUrl, currentLabel) => {
    if (!playerReady) setPlayerReady(true);

    // ── 1. Document PiP (Chrome 116+, HTTPS/localhost only — true always-on-top) ──
    if (window.documentPictureInPicture) {
      try {
        const pipWin = await window.documentPictureInPicture.requestWindow({
          width: 480,
          height: 270,
          disallowReturnToOpener: false,
        });
        const style = pipWin.document.createElement('style');
        style.textContent = `*{margin:0;padding:0;box-sizing:border-box}body{background:#000;width:100vw;height:100vh;overflow:hidden}iframe{width:100%;height:100%;border:none;display:block}`;
        pipWin.document.head.appendChild(style);
        const iframe = pipWin.document.createElement('iframe');
        iframe.src = currentEmbedUrl;
        iframe.allowFullscreen = true;
        iframe.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture');
        pipWin.document.body.appendChild(iframe);
        docPipWin.current = pipWin;
        setPipMode('document');
        pipWin.addEventListener('pagehide', () => {
          docPipWin.current = null;
          setPipMode('none');
        });
        return;
      } catch (err) {
        console.warn('Document PiP unavailable:', err.message);
      }
    }

    // ── 2. window.open() popup — separate OS window, works on HTTP too ──
    //    Positions to bottom-right of the screen like a real PiP window
    const pw = 480, ph = 280;
    const sl = window.screen.width  - pw - 16;
    const st = window.screen.height - ph - 60;

    const popup = window.open(
      'about:blank',
      'streamflix_pip',
      `width=${pw},height=${ph},left=${sl},top=${st},resizable=yes,scrollbars=no,` +
      `status=no,toolbar=no,menubar=no,location=no,directories=no`
    );

    if (popup && !popup.closed) {
      // Build a minimal page inside the popup
      popup.document.open();
      popup.document.write(`<!DOCTYPE html><html><head>
        <title>▶ StreamFlix PiP</title>
        <style>
          *{margin:0;padding:0;box-sizing:border-box}
          html,body{background:#000;width:100%;height:100%;overflow:hidden}
          iframe{position:fixed;inset:0;width:100%;height:100%;border:none}
          #bar{position:fixed;top:0;left:0;right:0;height:28px;background:rgba(0,0,0,.75);
               display:flex;align-items:center;justify-content:space-between;
               padding:0 8px;font:600 11px/1 "Segoe UI",sans-serif;color:#aaa;z-index:9;
               cursor:move;user-select:none}
          #bar span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
          iframe{top:28px;height:calc(100% - 28px)}
        </style>
      </head><body>
        <div id="bar">
          <span>▶ StreamFlix — ${(currentLabel || '').replace(/"/g, '&quot;')}</span>
          <span style="color:#667eea;font-size:10px">PiP</span>
        </div>
        <iframe src="${currentEmbedUrl}" allowfullscreen
          allow="autoplay; fullscreen; picture-in-picture"></iframe>
      </body></html>`);
      popup.document.close();

      docPipWin.current = popup;
      setPipMode('document');

      // Poll for when user closes the popup
      const poll = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(poll);
          docPipWin.current = null;
          setPipMode('none');
        }
      }, 600);

      return;
    }

    // ── 3. Last resort: CSS floating overlay (popup was blocked) ──
    addToast('Allow popups for this site to use true PiP', 'info');
    setPipMode('css');
  }, [playerReady]);

  const exitPip = useCallback(() => {
    if (pipMode === 'document' && docPipWin.current) {
      docPipWin.current.close();
      docPipWin.current = null;
    }
    // Reset CSS pip drag styles
    if (cssPipRef.current) {
      cssPipRef.current.style.cssText = '';
    }
    setPipMode('none');
  }, [pipMode]);

  // Close doc-pip window on page unload / navigation
  useEffect(() => {
    return () => {
      if (docPipWin.current) {
        docPipWin.current.close();
        docPipWin.current = null;
      }
    };
  }, []);

  // ── Data fetching ────────────────────────────────────────────
  useEffect(() => {
    setPlayerReady(false);
    setPipMode('none');
    if (docPipWin.current) { docPipWin.current.close(); docPipWin.current = null; }
    setSelectedSeason(1);
    setSelectedEpisode(1);
    setEpisodes([]);
    fetchMedia();
  }, [id, mediaType]);

  useEffect(() => {
    if (mediaType === 'tv' && media) fetchSeason(selectedSeason);
  }, [selectedSeason, media]);

  const fetchMedia = async () => {
    try {
      setLoading(true);
      const service = mediaType === 'tv' ? tvService : movieService;
      const data = (await service.getDetails(id)).data;
      setMedia(data);
      if (mediaType === 'tv' && data.seasons) {
        const real = data.seasons.filter((s) => s.season_number > 0);
        setSeasons(real.length > 0 ? real : data.seasons);
      }
    } catch {
      addToast('Failed to load details', 'error');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const fetchSeason = async (seasonNum) => {
    setEpLoading(true);
    try {
      const res = await tvService.getSeason(id, seasonNum);
      setEpisodes(res.data.episodes || []);
    } catch {
      addToast('Failed to load episodes', 'error');
    } finally {
      setEpLoading(false);
    }
  };

  const handleEpisodeClick = (ep) => {
    setSelectedEpisode(ep.episode_number);
    if (!playerReady) setPlayerReady(true);
    if (pipMode === 'none') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSeasonChange  = (num) => { setSelectedSeason(num); setSelectedEpisode(1); };
  const handleSourceChange  = (src) => { setSource(src); if (!playerReady) setPlayerReady(true); };

  const handleAddToWatchlist = async () => {
    if (!isAuthenticated) { addToast('Sign in to save to your watchlist', 'info'); return; }
    try {
      const title = media.title || media.name;
      await watchlistService.addMovie(media.id, title, media.overview, media.poster_path,
        media.release_date || media.first_air_date, media.vote_average);
      addToast(`"${title}" added to watchlist`, 'success');
    } catch (err) {
      addToast(err.response?.status === 400 ? 'Already in your watchlist' : 'Failed to add', 'warning');
    }
  };

  // ── Derived values ───────────────────────────────────────────
  const posterUrl   = media?.poster_path   ? `https://image.tmdb.org/t/p/w342${media.poster_path}`    : null;
  const backdropUrl = media?.backdrop_path ? `https://image.tmdb.org/t/p/w1280${media.backdrop_path}` : null;
  const title       = media?.title  || media?.name;
  const year        = (media?.release_date || media?.first_air_date)?.substring(0, 4);
  const rating      = media?.vote_average?.toFixed(1);
  const runtime     = media?.runtime
    ? `${Math.floor(media.runtime / 60)}h ${media.runtime % 60}m`
    : media?.episode_run_time?.[0] ? `~${media.episode_run_time[0]}m / ep` : null;
  const genres      = media?.genres?.map((g) => g.name).join(', ');
  const currentEp   = episodes.find((e) => e.episode_number === selectedEpisode);
  const nowPlaying  = mediaType === 'tv' && currentEp
    ? `S${selectedSeason} E${selectedEpisode} — ${currentEp.name}`
    : title;
  const embedUrl    = getEmbedUrl(source, mediaType, id, selectedSeason, selectedEpisode);

  const supportsDocPip = typeof window !== 'undefined' && !!window.documentPictureInPicture;

  if (loading) return (
    <div className="watch-loading">
      <div className="watch-skeleton-player" />
      <div className="watch-skeleton-info" />
    </div>
  );
  if (!media) return null;

  return (
    <div className="watch-page">

      {/* ── Document PiP active: show placeholder in page ── */}
      {pipMode === 'document' && (
        <div className="pip-doc-placeholder">
          <div className="pip-doc-placeholder-inner">
            <span className="pip-doc-icon">⊡</span>
            <p>Playing in a separate window</p>
            <p className="pip-doc-sub">{nowPlaying}</p>
            <p className="pip-doc-sub" style={{ marginTop: '0.25rem' }}>
              The player is open in a floating window — switch apps, minimize, or browse freely.
            </p>
            <button className="pip-doc-close-btn" onClick={exitPip}>
              Close PiP Window
            </button>
          </div>
        </div>
      )}

      {/* ── CSS pip layout placeholder ── */}
      {pipMode === 'css' && <div className="pip-placeholder" />}

      {/* ── Player wrapper (hidden when doc-pip active) ── */}
      {pipMode !== 'document' && (
        <div ref={cssPipRef} className={`player-wrap ${pipMode === 'css' ? 'player-pip' : ''}`}>

          {/* CSS pip chrome (drag handle + controls) */}
          {pipMode === 'css' && (
            <div className="pip-chrome" onMouseDown={onDragStart} onTouchStart={onDragStart}>
              <span className="pip-now-playing">▶ {nowPlaying}</span>
              <div className="pip-btns">
                <button className="pip-btn-ctrl" onClick={exitPip} title="Restore">↗</button>
                <button className="pip-btn-ctrl pip-btn-close"
                  onClick={() => { exitPip(); setPlayerReady(false); }} title="Close">✕</button>
              </div>
            </div>
          )}

          {!playerReady ? (
            <div className="player-overlay"
              style={backdropUrl ? { backgroundImage: `url(${backdropUrl})` } : {}}>
              <div className="player-overlay-inner">
                <button className="play-btn" onClick={() => setPlayerReady(true)}>▶ Play</button>
                <p>{nowPlaying}</p>
              </div>
            </div>
          ) : (
            <>
              <iframe
                key={`${source}-${id}-${selectedSeason}-${selectedEpisode}`}
                className="player-iframe"
                src={embedUrl}
                allowFullScreen
                allow="autoplay; fullscreen; picture-in-picture"
                referrerPolicy="no-referrer"
                title={nowPlaying}
              />
              {/* PiP launch button — hover over player */}
              {pipMode === 'none' && (
                <button
                  className="pip-launch-btn"
                  onClick={() => enterPip(embedUrl, nowPlaying)}
                  title={supportsDocPip ? 'True Picture-in-Picture (works outside browser)' : 'Picture-in-Picture'}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="3" width="20" height="14" rx="2"/>
                    <rect x="12" y="10" width="9" height="7" rx="1" fill="currentColor" stroke="none"/>
                  </svg>
                  PiP
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Source bar ── */}
      <div className="source-bar">
        <span className="source-bar-label">
          {playerReady ? `▶ ${nowPlaying}` : title}
        </span>
        <div className="source-bar-right">
          {/* Ad Shield toggle */}
          <button
            className={`ad-shield-btn ${adShield ? 'shield-on' : 'shield-off'}`}
            onClick={() => setAdShield((v) => !v)}
            title={adShield
              ? 'Ad Shield ON — click to disable (e.g. to switch tabs freely)'
              : 'Ad Shield OFF — click to enable popup ad blocking'}
          >
            {adShield ? '🛡 Ad Shield' : '🛡 Shield Off'}
          </button>

          <div className="source-switcher">
            <span className="source-switcher-label">Source:</span>
            {SOURCES.map((s) => (
              <button key={s.id}
                className={`source-btn ${source === s.id ? 'active' : ''}`}
                onClick={() => handleSourceChange(s.id)}
                title={s.hint}
              >
                {s.label}
                {s.hint && <span className="source-hint">{s.hint}</span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Media info ── */}
      <div className="watch-info">
        <div className="watch-info-left">
          {posterUrl && <img src={posterUrl} alt={title} className="watch-poster" />}
        </div>
        <div className="watch-info-right">
          <div className="watch-title-row">
            <h1 className="watch-title">{title}</h1>
            {mediaType === 'tv' && <span className="watch-type-badge tv">TV Series</span>}
          </div>
          <div className="watch-meta">
            {year && <span>{year}</span>}
            {runtime && <span>{runtime}</span>}
            {media.number_of_seasons && <span>{media.number_of_seasons} Season{media.number_of_seasons > 1 ? 's' : ''}</span>}
            {media.number_of_episodes && <span>{media.number_of_episodes} Episodes</span>}
            {media.status && <span className="watch-status">{media.status}</span>}
          </div>
          {rating && rating !== '0.0' && <ScoreBadge score={rating} />}
          {genres && <p className="watch-genres">{genres}</p>}
          {media.overview && <p className="watch-overview">{media.overview}</p>}
          <div className="watch-actions">
            {!playerReady && (
              <button className="btn-primary" onClick={() => setPlayerReady(true)}>▶ Watch Now</button>
            )}
            {playerReady && pipMode === 'none' && (
              <button className="btn-pip" onClick={() => enterPip(embedUrl, nowPlaying)}>
                ⊡ {supportsDocPip ? 'Picture in Picture' : 'Mini Player'}
              </button>
            )}
            {pipMode !== 'none' && (
              <button className="btn-pip btn-pip--active" onClick={exitPip}>
                ⊠ Exit PiP
              </button>
            )}
            <button className="btn-secondary" onClick={handleAddToWatchlist}>+ Watchlist</button>
            <button className="btn-ghost" onClick={() => navigate(-1)}>← Back</button>
          </div>
        </div>
      </div>

      {/* ── Seasons & Episodes (TV only) ── */}
      {mediaType === 'tv' && seasons.length > 0 && (
        <div className="seasons-section">
          <div className="seasons-header">
            <h2 className="seasons-title">Episodes</h2>
            <div className="season-tabs">
              {seasons.map((s) => (
                <button key={s.season_number}
                  className={`season-tab ${selectedSeason === s.season_number ? 'active' : ''}`}
                  onClick={() => handleSeasonChange(s.season_number)}
                >
                  Season {s.season_number}
                  {s.episode_count && <span className="season-ep-count">{s.episode_count} ep</span>}
                </button>
              ))}
            </div>
          </div>

          {seasons.find((s) => s.season_number === selectedSeason)?.overview && (
            <p className="season-overview">
              {seasons.find((s) => s.season_number === selectedSeason).overview}
            </p>
          )}

          {epLoading ? (
            <div className="ep-skeleton-list">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="ep-skeleton" />)}
            </div>
          ) : (
            <div className="episodes-list">
              {episodes.map((ep) => (
                <EpisodeCard key={ep.id} ep={ep}
                  isActive={selectedEpisode === ep.episode_number}
                  onClick={() => handleEpisodeClick(ep)} />
              ))}
              {episodes.length === 0 && <p className="ep-empty">No episode data available.</p>}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
