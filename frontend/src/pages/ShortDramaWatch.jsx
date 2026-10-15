import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Hls from 'hls.js';
import Icon from '../components/Icon';
import {
  providerById, getDrama, getEpisodeStream, getDailymotionVideo, SourceUnavailableError,
} from '../shortDrama';
import '../styles/ShortDramaWatch.css';

// ── Captions ──
// Browsers size native captions from the video's height, which is enormous on
// a tall portrait video. We hide native rendering and draw cues ourselves.
const CC_KEY = 'sd_captions_on';

function parseTime(t) {
  const parts = t.trim().replace(',', '.').split(':').map(Number);
  while (parts.length < 3) parts.unshift(0);
  return parts[0] * 3600 + parts[1] * 60 + parts[2];
}

// Minimal WebVTT / SRT parser → [{ start, end, text }]
function parseSubtitles(raw) {
  const cues = [];
  for (const block of raw.replace(/\r/g, '').split(/\n\n+/)) {
    const lines = block.split('\n');
    const i = lines.findIndex((l) => l.includes('-->'));
    if (i === -1) continue;
    const [a, b] = lines[i].split('-->');
    const text = lines.slice(i + 1).join('\n').trim();
    if (text) cues.push({ start: parseTime(a), end: parseTime(b.trim().split(' ')[0]), text });
  }
  return cues;
}

const cleanCue = (text) => text.replace(/<[^>]+>/g, '').replace(/\{\\[^}]*\}/g, '').trim();

// Plays an HLS (.m3u8) or MP4 stream in a <video>, using hls.js where the
// browser has no native HLS support.
function VerticalPlayer({ src, subtitle, onEnded, onError }) {
  const videoRef = useRef(null);
  const [needsTap, setNeedsTap] = useState(false);
  const [caption, setCaption] = useState('');
  const [hasCaptions, setHasCaptions] = useState(false);
  const [ccOn, setCcOn] = useState(() => {
    try { return localStorage.getItem(CC_KEY) !== 'off'; } catch { return true; }
  });
  const fileCues = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;
    setNeedsTap(false);
    setCaption('');
    setHasCaptions(false);
    let hls;

    const tryPlay = () => video.play().catch(() => setNeedsTap(true));

    if (/\.m3u8/i.test(src) && !video.canPlayType('application/vnd.apple.mpegurl') && Hls.isSupported()) {
      // subtitleDisplay:false keeps hls.js's text tracks 'hidden'; cues still load
      hls = new Hls({ enableWorker: true, subtitleDisplay: false });
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, tryPlay);
      hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, (_e, data) => {
        const tracks = data.subtitleTracks || [];
        if (!tracks.length) return;
        const en = tracks.findIndex((t) => /^en/i.test(t.lang || '') || /english/i.test(t.name || ''));
        hls.subtitleTrack = en >= 0 ? en : 0;
      });
      hls.on(Hls.Events.ERROR, (_e, data) => { if (data.fatal) onError?.('This stream could not be loaded.'); });
    } else {
      video.src = src;
      video.addEventListener('loadedmetadata', tryPlay, { once: true });
    }
    return () => {
      if (hls) hls.destroy();
      video.removeAttribute('src');
      video.load();
    };
  }, [src, onError]);

  // Separate subtitle file (VTT/SRT): fetch and parse it ourselves
  useEffect(() => {
    fileCues.current = null;
    if (!subtitle) return;
    let cancelled = false;
    fetch(subtitle)
      .then((r) => (r.ok ? r.text() : Promise.reject()))
      .then((raw) => {
        if (cancelled) return;
        const cues = parseSubtitles(raw);
        if (cues.length) { fileCues.current = cues; setHasCaptions(true); }
      })
      .catch(() => { /* subtitle host blocks cross-site requests; play without */ });
    return () => { cancelled = true; };
  }, [subtitle]);

  // Text tracks inside the stream (HLS subtitles): keep native rendering off
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const tracks = video.textTracks;
    const hideAll = () => {
      let any = false;
      for (const t of tracks) {
        if (t.kind === 'subtitles' || t.kind === 'captions') {
          any = true;
          if (t.mode === 'showing') t.mode = 'hidden';
        }
      }
      if (any) setHasCaptions(true);
    };
    hideAll();
    tracks.addEventListener('addtrack', hideAll);
    tracks.addEventListener('change', hideAll);
    return () => {
      tracks.removeEventListener('addtrack', hideAll);
      tracks.removeEventListener('change', hideAll);
    };
  }, [src]);

  // Show the cue for the current time from whichever source has captions
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let frame;
    const tick = () => {
      let text = '';
      const t = video.currentTime;
      if (fileCues.current) {
        text = fileCues.current.filter((c) => t >= c.start && t <= c.end).map((c) => c.text).join('\n');
      } else {
        for (const track of video.textTracks) {
          if (track.mode !== 'hidden' || !track.activeCues?.length) continue;
          text = Array.from(track.activeCues).map((c) => c.text).join('\n');
          break;
        }
      }
      const next = cleanCue(text);
      setCaption((prev) => (prev === next ? prev : next));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [src]);

  const toggleCc = () => {
    setCcOn((on) => {
      try { localStorage.setItem(CC_KEY, on ? 'off' : 'on'); } catch { /* ignore */ }
      return !on;
    });
  };

  return (
    <div className="vp">
      <video
        ref={videoRef}
        className="vp-video"
        controls
        playsInline
        onEnded={onEnded}
        onError={() => onError?.('This stream could not be played.')}
      />
      {ccOn && caption && (
        <div className="vp-caption" aria-live="polite">
          {caption.split('\n').map((line, i) => <span key={i}>{line}</span>)}
        </div>
      )}
      {hasCaptions && (
        <button
          className={`vp-cc ${ccOn ? 'is-on' : ''}`}
          onClick={toggleCc}
          aria-pressed={ccOn}
          aria-label={ccOn ? 'Hide subtitles' : 'Show subtitles'}
          title={ccOn ? 'Hide subtitles' : 'Show subtitles'}
        >
          CC
        </button>
      )}
      {needsTap && (
        <button className="vp-tap" onClick={() => { videoRef.current?.play(); setNeedsTap(false); }}>
          <span className="vp-tap-icon"><Icon name="play" size={30} /></span>
          Play episode
        </button>
      )}
    </div>
  );
}

export default function ShortDramaWatch() {
  const { provider, id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const epNumber = Number(searchParams.get('ep')) || 1;
  const isDm = provider === 'dailymotion';
  const providerInfo = providerById(provider);

  const [drama, setDrama] = useState(location.state?.drama || null);
  const [episodes, setEpisodes] = useState([]);
  const [stream, setStream] = useState(null);
  const [loading, setLoading] = useState(true);
  const [streamLoading, setStreamLoading] = useState(false);
  const [error, setError] = useState(null);
  const [autoNext, setAutoNext] = useState(true);

  // Drama details + episode list
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const load = isDm ? getDailymotionVideo(id) : getDrama(provider, id);
    load
      .then((d) => {
        if (cancelled) return;
        setDrama((prev) => ({ ...prev, ...d, cover: d.cover || prev?.cover, title: d.title || prev?.title }));
        setEpisodes(d.episodes || []);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof SourceUnavailableError
          ? `${err.message} Dailymotion short dramas still work.`
          : err.message || 'Could not load this drama.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [provider, id, isDm]);

  // Current episode stream
  const currentEpisode = episodes.find((e) => e.number === epNumber) || episodes[0];
  useEffect(() => {
    if (isDm || !currentEpisode) return;
    let cancelled = false;
    setStream(null);
    setStreamLoading(true);
    setError(null);
    getEpisodeStream(provider, id, currentEpisode)
      .then((s) => { if (!cancelled) setStream(s); })
      .catch((err) => { if (!cancelled) setError(err.message || 'Could not load this episode.'); })
      .finally(() => { if (!cancelled) setStreamLoading(false); });
    return () => { cancelled = true; };
  }, [provider, id, isDm, currentEpisode]);

  const goToEpisode = useCallback((n) => {
    setSearchParams({ ep: String(n) }, { replace: true });
  }, [setSearchParams]);

  const lastEpisode = episodes.length ? episodes[episodes.length - 1].number : 1;
  const hasPrev = epNumber > (episodes[0]?.number || 1);
  const hasNext = epNumber < lastEpisode;

  const handleEnded = useCallback(() => {
    if (autoNext && hasNext) goToEpisode(epNumber + 1);
  }, [autoNext, hasNext, epNumber, goToEpisode]);

  const handleStreamError = useCallback((msg) => setError(msg), []);

  // Arrow keys: up/left = previous episode, down/right = next
  useEffect(() => {
    if (isDm) return;
    const onKey = (e) => {
      if (e.target.closest('input, textarea, video')) return;
      if ((e.key === 'ArrowDown' || e.key === 'ArrowRight') && hasNext) goToEpisode(epNumber + 1);
      if ((e.key === 'ArrowUp' || e.key === 'ArrowLeft') && hasPrev) goToEpisode(epNumber - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isDm, hasNext, hasPrev, epNumber, goToEpisode]);

  const title = drama?.title || 'Short drama';
  const sourceLabel = isDm ? 'Dailymotion' : providerInfo?.label;

  return (
    <div className="sdw-page">
      <button className="btn btn-ghost sdw-back" onClick={() => navigate('/shortdramas')}>
        <Icon name="back" size={18} /> All short dramas
      </button>

      <div className="sdw-layout">
        <div className="sdw-stage">
          {drama?.cover && <div className="sdw-stage-glow" style={{ backgroundImage: `url(${drama.cover})` }} />}
          <div className="sdw-frame">
            {isDm ? (
              <iframe
                className="vp-video"
                src={`https://www.dailymotion.com/embed/video/${encodeURIComponent(id)}?queue-enable=false&sharing-enable=false&ui-start-screen-info=false`}
                title={title}
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
              />
            ) : stream?.url && !error ? (
              <VerticalPlayer src={stream.url} subtitle={stream.subtitle} onEnded={handleEnded} onError={handleStreamError} />
            ) : (
              <div className="sdw-frame-state">
                {error ? (
                  <>
                    <Icon name="alert" size={28} />
                    <p>{error}</p>
                    {hasNext && <button className="btn btn-ghost" onClick={() => goToEpisode(epNumber + 1)}>Skip to episode {epNumber + 1}</button>}
                  </>
                ) : (loading || streamLoading) ? (
                  <div className="spinner" aria-label="Loading" />
                ) : null}
              </div>
            )}
          </div>
          {!isDm && episodes.length > 1 && (
            <div className="sdw-stepper">
              <button className="btn btn-ghost" disabled={!hasPrev} onClick={() => goToEpisode(epNumber - 1)}>
                <Icon name="left" size={18} /> Previous
              </button>
              <span className="sdw-stepper-count">Episode {epNumber} of {lastEpisode}</span>
              <button className="btn btn-ghost" disabled={!hasNext} onClick={() => goToEpisode(epNumber + 1)}>
                Next <Icon name="right" size={18} />
              </button>
            </div>
          )}
        </div>

        <aside className="sdw-side">
          <p className="sdw-source">{sourceLabel}</p>
          <h1 className="sdw-title">{title}</h1>
          {drama?.description && <p className="sdw-desc">{drama.description}</p>}

          {!isDm && episodes.length > 0 && (
            <>
              <div className="sdw-eps-head">
                <h2>Episodes</h2>
                <label className="sdw-autonext">
                  <input type="checkbox" checked={autoNext} onChange={(e) => setAutoNext(e.target.checked)} />
                  Play next automatically
                </label>
              </div>
              <div className="sdw-eps">
                {episodes.map((ep) => (
                  <button
                    key={ep.number}
                    className={`sdw-ep ${ep.number === epNumber ? 'active' : ''}`}
                    onClick={() => goToEpisode(ep.number)}
                    aria-current={ep.number === epNumber ? 'true' : undefined}
                  >
                    {ep.number}
                  </button>
                ))}
              </div>
              <p className="sdw-hint">Arrow keys move between episodes.</p>
            </>
          )}

          {isDm && (
            <>
              <a
                className="btn btn-ghost sdw-external"
                href={`https://www.dailymotion.com/video/${encodeURIComponent(id)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Icon name="expand" size={16} /> Open on Dailymotion
              </a>
              <p className="sdw-hint">Dailymotion uploads usually hold the full drama in one video. If the player stays blank, open it on Dailymotion.</p>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
