import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Icon from '../components/Icon';
import {
  PROVIDERS, DM_TOPICS, listDramas, searchDramas, listDailymotionPortrait,
  sansekaiBlockedUntil, SourceUnavailableError,
} from '../shortDrama';
import '../styles/ShortDramas.css';

const DAILYMOTION = { id: 'dailymotion', label: 'Dailymotion' };
const TABS = [...PROVIDERS, DAILYMOTION];
const TAB_KEY = 'sd_last_tab';

function initialTab() {
  if (sansekaiBlockedUntil()) return 'dailymotion';
  try { return TABS.some((t) => t.id === localStorage.getItem(TAB_KEY)) ? localStorage.getItem(TAB_KEY) : PROVIDERS[0].id; }
  catch { return PROVIDERS[0].id; }
}

function formatDuration(sec) {
  if (!sec) return null;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h ? `${h}h ${m}m` : `${m}m`;
}

function DramaCard({ drama, onOpen }) {
  const meta = drama.episodes
    ? `${drama.episodes} episodes`
    : formatDuration(drama.duration);
  return (
    <button className="sd-card" onClick={() => onOpen(drama)} title={drama.title}>
      <div className="sd-card-poster">
        {drama.cover
          ? <img src={drama.cover} alt="" loading="lazy" referrerPolicy="no-referrer" />
          : <div className="sd-card-noimg"><Icon name="phone" size={28} /></div>}
        <span className="sd-card-play"><Icon name="play" size={22} /></span>
        {meta && <span className="sd-card-meta">{meta}</span>}
      </div>
      <span className="sd-card-title">{drama.title}</span>
    </button>
  );
}

export default function ShortDramas() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const urlQuery = params.get('q') || '';
  const [tab, setTab] = useState(initialTab);
  const [topic, setTopic] = useState('all');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState(null);
  const [searchInput, setSearchInput] = useState(urlQuery);
  const [query, setQuery] = useState(urlQuery);

  // Searches can arrive from the header search box via ?q=
  useEffect(() => {
    setSearchInput(urlQuery);
    setQuery(urlQuery);
  }, [urlQuery]);
  const [dmPage, setDmPage] = useState(1);
  const [dmHasMore, setDmHasMore] = useState(false);

  const isDm = tab === 'dailymotion';

  const fallBackToDailymotion = useCallback((err) => {
    setNotice(`${err.message} Showing Dailymotion short dramas instead.`);
    setTab('dailymotion');
  }, []);

  // Load the grid whenever the source / topic / search changes
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setItems([]);
    setDmPage(1);

    const load = async () => {
      try {
        if (isDm) {
          const dmQuery = query ? `${query} short drama` : DM_TOPICS.find((t) => t.id === topic).query;
          const { items: list, hasMore } = await listDailymotionPortrait(dmQuery, 1);
          if (!cancelled) { setItems(list); setDmHasMore(hasMore); }
        } else {
          const list = query ? await searchDramas(tab, query) : await listDramas(tab);
          if (!cancelled) setItems(list);
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof SourceUnavailableError) fallBackToDailymotion(err);
        else setError(err.message || 'Could not load short dramas.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [tab, topic, query, isDm, fallBackToDailymotion]);

  const loadMoreDm = async () => {
    const next = dmPage + 1;
    setLoading(true);
    try {
      const dmQuery = query ? `${query} short drama` : DM_TOPICS.find((t) => t.id === topic).query;
      const { items: list, hasMore } = await listDailymotionPortrait(dmQuery, next);
      setItems((prev) => [...prev, ...list.filter((v) => !prev.some((p) => p.id === v.id))]);
      setDmHasMore(hasMore);
      setDmPage(next);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectTab = (id) => {
    if (id !== 'dailymotion' && sansekaiBlockedUntil()) {
      setNotice('Short drama apps are paused on this network for now. Dailymotion still works.');
      return;
    }
    setNotice(null);
    setTab(id);
    try { localStorage.setItem(TAB_KEY, id); } catch { /* ignore */ }
  };

  const submitSearch = (e) => {
    e.preventDefault();
    const q = searchInput.trim();
    setParams(q ? { q } : {}, { replace: true });
  };

  const clearSearch = () => setParams({}, { replace: true });

  const openDrama = (drama) => {
    navigate(`/shortdramas/${drama.provider}/${encodeURIComponent(drama.id)}`, { state: { drama } });
  };

  const tabLabel = TABS.find((t) => t.id === tab)?.label;

  return (
    <div className="sd-page">
      <header className="sd-hero">
        <div className="sd-hero-copy">
          <h1>Short dramas</h1>
          <p>Vertical, binge-sized episodes. Most run one or two minutes, and the whole story fits in an evening.</p>
        </div>
        <form className="sd-search" onSubmit={submitSearch} role="search">
          <Icon name="search" size={18} />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={`Search ${tabLabel}`}
            aria-label={`Search ${tabLabel}`}
          />
          {query && (
            <button type="button" className="sd-search-clear" onClick={clearSearch} aria-label="Clear search">
              <Icon name="close" size={16} />
            </button>
          )}
        </form>
      </header>

      <nav className="sd-tabs" aria-label="Source">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`sd-tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => selectTab(t.id)}
            aria-pressed={tab === t.id}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {isDm && !query && (
        <div className="sd-topics">
          {DM_TOPICS.map((t) => (
            <button key={t.id} className={`chip ${topic === t.id ? 'active' : ''}`} onClick={() => setTopic(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      {notice && (
        <div className="sd-notice" role="status">
          <Icon name="info" size={18} />
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} aria-label="Dismiss"><Icon name="close" size={16} /></button>
        </div>
      )}

      {query && <p className="sd-result-label">Results for "{query}" on {tabLabel}</p>}

      {error ? (
        <div className="empty-state">
          <p>{error}</p>
          <button className="btn btn-ghost" onClick={() => selectTab('dailymotion')}>Browse Dailymotion instead</button>
        </div>
      ) : (
        <div className="sd-grid">
          {items.map((d) => <DramaCard key={`${d.provider}-${d.id}`} drama={d} onOpen={openDrama} />)}
          {loading && Array.from({ length: items.length ? 6 : 18 }).map((_, i) => <div key={`sk${i}`} className="sd-card-skeleton" />)}
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="empty-state">
          <p>{query ? `Nothing on ${tabLabel} matches "${query}".` : `${tabLabel} has nothing to show right now.`}</p>
          {query ? <button className="btn btn-ghost" onClick={clearSearch}>Clear search</button>
                 : <button className="btn btn-ghost" onClick={() => selectTab('dailymotion')}>Try Dailymotion</button>}
        </div>
      )}

      {isDm && dmHasMore && !loading && items.length > 0 && (
        <div className="load-more">
          <button className="btn btn-ghost" onClick={loadMoreDm}>Load more</button>
        </div>
      )}
    </div>
  );
}
