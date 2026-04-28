import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { dailymotionService } from '../api';
import { useToast } from '../context/ToastContext';
import '../styles/ShortDramaWatch.css';

function formatDuration(seconds) {
  if (!seconds) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s}s`;
}

function formatViews(n) {
  if (!n) return null;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M views`;
  if (n >= 1_000)     return `${Math.round(n / 1_000)}K views`;
  return `${n} views`;
}

export default function ShortDramaWatch() {
  const { id }       = useParams();
  const location     = useLocation();
  const navigate     = useNavigate();
  const { addToast } = useToast();

  const [video,       setVideo]       = useState(location.state?.video || null);
  const [loading,     setLoading]     = useState(!location.state?.video);
  const [playerReady, setPlayerReady] = useState(false);
  const [adShield,    setAdShield]    = useState(true);
  const [pipMode,     setPipMode]     = useState('none'); // 'none' | 'document' | 'css'

  const docPipWin = useRef(null);
  const cssPipRef = useRef(null);
  const dragData  = useRef({ active: false });

  const embedUrl = `https://www.dailymotion.com/embed/video/${id}?autoplay=1&queue-autoplay-next=0&queue-enable=0&sharing-enable=0`;

  // ── Fetch video details if not passed via state ──
  useEffect(() => {
    if (video) return;
    setLoading(true);
    dailymotionService.getVideo(id)
      .then((res) => setVideo(res.data))
      .catch(() => { addToast('Failed to load video', 'error'); navigate('/shortdramas'); })
      .finally(() => setLoading(false));
  }, [id]);

  // ── Ad Shield ──
  useEffect(() => {
    if (!playerReady || !adShield) return;

    let cooldown    = false;
    let lastBlurAt  = 0;

    const block = () => {
      window.focus();
      if (!cooldown) {
        cooldown = true;
        addToast('🛡 Ad popup blocked — pulled you back', 'warning');
        setTimeout(() => { cooldown = false; }, 3000);
      }
    };

    const onBlur = () => {
      lastBlurAt = Date.now();
      setTimeout(() => {
        if (document.hasFocus()) return;
        block();
      }, 80);
    };

    const onVisibilityChange = () => {
      if (document.hidden && Date.now() - lastBlurAt < 400) block();
    };

    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [playerReady, adShield, addToast]);

  // ── CSS pip drag ──
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
    window.removeEventListener('mouseup', onDragEnd);
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
    window.addEventListener('mouseup', onDragEnd);
  }, [onDragMove, onDragEnd]);

  // ── PiP ──
  const enterPip = useCallback(async () => {
    if (!playerReady) setPlayerReady(true);

    if (window.documentPictureInPicture) {
      try {
        const pipWin = await window.documentPictureInPicture.requestWindow({ width: 480, height: 270 });
        const style = pipWin.document.createElement('style');
        style.textContent = `*{margin:0;padding:0;box-sizing:border-box}body{background:#000;width:100vw;height:100vh;overflow:hidden}iframe{width:100%;height:100%;border:none}`;
        pipWin.document.head.appendChild(style);
        const iframe = pipWin.document.createElement('iframe');
        iframe.src = embedUrl;
        iframe.allowFullscreen = true;
        iframe.setAttribute('allow', 'autoplay; fullscreen');
        pipWin.document.body.appendChild(iframe);
        docPipWin.current = pipWin;
        setPipMode('document');
        pipWin.addEventListener('pagehide', () => { docPipWin.current = null; setPipMode('none'); });
        return;
      } catch {}
    }

    const pw = 480, ph = 280;
    const popup = window.open('about:blank', 'sdrama_pip',
      `width=${pw},height=${ph},left=${window.screen.width - pw - 16},top=${window.screen.height - ph - 60},resizable=yes,scrollbars=no,status=no,toolbar=no,menubar=no,location=no`);

    if (popup && !popup.closed) {
      popup.document.open();
      popup.document.write(`<!DOCTYPE html><html><head>
        <title>▶ StreamFlix PiP</title>
        <style>*{margin:0;padding:0;box-sizing:border-box}html,body{background:#000;width:100%;height:100%;overflow:hidden}
        #bar{position:fixed;top:0;left:0;right:0;height:28px;background:rgba(0,0,0,.8);display:flex;align-items:center;justify-content:space-between;padding:0 8px;font:600 11px/1 "Segoe UI",sans-serif;color:#aaa;z-index:9}
        iframe{position:fixed;top:28px;left:0;right:0;bottom:0;width:100%;height:calc(100% - 28px);border:none}</style>
      </head><body>
        <div id="bar"><span>▶ ${(video?.title || 'Short Drama').replace(/"/g, '&quot;')}</span><span style="color:#ff507a;font-size:10px">PiP</span></div>
        <iframe src="${embedUrl}" allowfullscreen allow="autoplay; fullscreen"></iframe>
      </body></html>`);
      popup.document.close();
      docPipWin.current = popup;
      setPipMode('document');
      const poll = setInterval(() => {
        if (!popup || popup.closed) { clearInterval(poll); docPipWin.current = null; setPipMode('none'); }
      }, 600);
      return;
    }

    addToast('Allow popups for this site to use PiP', 'info');
    setPipMode('css');
  }, [playerReady, embedUrl, video]);

  const exitPip = useCallback(() => {
    if (pipMode === 'document' && docPipWin.current) {
      docPipWin.current.close();
      docPipWin.current = null;
    }
    if (cssPipRef.current) cssPipRef.current.style.cssText = '';
    setPipMode('none');
  }, [pipMode]);

  useEffect(() => () => { docPipWin.current?.close(); }, []);

  if (loading) return (
    <div className="sdwatch-loading">
      <div className="sdwatch-skeleton-player" />
      <div className="sdwatch-skeleton-info" />
    </div>
  );

  if (!video) return null;

  const supportsDocPip = typeof window !== 'undefined' && !!window.documentPictureInPicture;

  return (
    <div className="sdwatch-page">

      {pipMode === 'document' && (
        <div className="sdwatch-pip-placeholder">
          <div className="sdwatch-pip-inner">
            <span>⊡</span>
            <p>Playing in a separate window</p>
            <p className="sdwatch-pip-sub">{video.title}</p>
            <button onClick={exitPip}>Close PiP Window</button>
          </div>
        </div>
      )}

      {pipMode === 'css' && <div className="sdwatch-pip-spacer" />}

      {pipMode !== 'document' && (
        <div ref={cssPipRef} className={`sdwatch-player-wrap ${pipMode === 'css' ? 'sdwatch-player-pip' : ''}`}>
          {pipMode === 'css' && (
            <div className="sdwatch-pip-chrome" onMouseDown={onDragStart} onTouchStart={onDragStart}>
              <span>▶ {video.title}</span>
              <div>
                <button onClick={exitPip}>↗</button>
                <button onClick={() => { exitPip(); setPlayerReady(false); }}>✕</button>
              </div>
            </div>
          )}
          {!playerReady ? (
            <div className="sdwatch-overlay">
              <div className="sdwatch-overlay-inner">
                <button className="sdwatch-play-btn" onClick={() => setPlayerReady(true)}>▶ Play</button>
                <p>{video.title}</p>
              </div>
            </div>
          ) : (
            <>
              <iframe
                key={id}
                className="sdwatch-iframe"
                src={embedUrl}
                allowFullScreen
                allow="autoplay; fullscreen"
                referrerPolicy="no-referrer"
                title={video.title}
              />
              {pipMode === 'none' && (
                <button className="sdwatch-pip-btn" onClick={enterPip}
                  title={supportsDocPip ? 'True PiP' : 'Mini Player'}>
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

      {/* Source / control bar */}
      <div className="sdwatch-bar">
        <span className="sdwatch-bar-title">{playerReady ? `▶ ${video.title}` : video.title}</span>
        <div className="sdwatch-bar-right">
          <button
            className={`sdwatch-shield-btn ${adShield ? 'on' : 'off'}`}
            onClick={() => setAdShield((v) => !v)}
            title={adShield ? 'Ad Shield ON' : 'Ad Shield OFF'}
          >
            {adShield ? '🛡 Ad Shield' : '🛡 Shield Off'}
          </button>
          {playerReady && pipMode === 'none' && (
            <button className="sdwatch-pip-bar-btn" onClick={enterPip}>⊡ PiP</button>
          )}
          {pipMode !== 'none' && (
            <button className="sdwatch-pip-bar-btn active" onClick={exitPip}>⊠ Exit PiP</button>
          )}
        </div>
      </div>

      {/* Video info */}
      <div className="sdwatch-info">
        <div className="sdwatch-title-row">
          <h1 className="sdwatch-title">{video.title}</h1>
          <span className="sdwatch-badge">Short Drama</span>
        </div>
        <div className="sdwatch-meta">
          {formatDuration(video.duration) && <span>{formatDuration(video.duration)}</span>}
          {formatViews(video.views_total) && <span>{formatViews(video.views_total)}</span>}
          {video.created_time && (
            <span>{new Date(video.created_time * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}</span>
          )}
        </div>
        {video.description && (
          <p className="sdwatch-desc">{video.description.substring(0, 300)}{video.description.length > 300 ? '…' : ''}</p>
        )}
        <div className="sdwatch-actions">
          {!playerReady && (
            <button className="sdwatch-btn-primary" onClick={() => setPlayerReady(true)}>▶ Watch Now</button>
          )}
          <button className="sdwatch-btn-ghost" onClick={() => navigate(-1)}>← Back</button>
          <button className="sdwatch-btn-ghost" onClick={() => navigate('/shortdramas')}>All Dramas</button>
        </div>
      </div>

    </div>
  );
}
