// Portrait short dramas.
//
// Primary: Sansekai's free short-drama API (https://api.sansekai.my.id), called
// straight from the viewer's browser so each viewer has their own rate limit —
// the free tier allows ~10 requests/min per IP and bans IPs that go over, so
// every call goes through a throttled queue and a cache.
// Fallback: Dailymotion portrait (vertical) short-drama uploads — no key, no limit.
//
// Only providers whose streams play directly in the browser are listed; the
// others (DramaBox, ShortMax, GoodShort, FlickReels, Melolo, DramaNova) need a
// server-side decrypt/proxy step.

const SANSEKAI = 'https://api.sansekai.my.id/api';
const LANG = 'en';

// ── Small storage helpers (storage can be unavailable — never throw) ──
const store = {
  get(key, area = localStorage) {
    try { return JSON.parse(area.getItem(key)); } catch { return null; }
  },
  set(key, value, area = localStorage) {
    try { area.setItem(key, JSON.stringify(value)); } catch { /* full or blocked */ }
  },
};

// ── Availability: remember 429/403 so we stop calling until it's safe ──
const BLOCK_KEY = 'sd_sansekai_blocked_until';

export function sansekaiBlockedUntil() {
  const until = store.get(BLOCK_KEY);
  return until && until > Date.now() ? until : 0;
}

function markBlocked(ms) {
  store.set(BLOCK_KEY, Date.now() + ms);
}

export class SourceUnavailableError extends Error {
  constructor(message, retryAt = 0) {
    super(message);
    this.name = 'SourceUnavailableError';
    this.retryAt = retryAt;
  }
}

// ── Throttle: at most 8 calls per rolling minute, shared across tabs ──
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 8;
const STAMPS_KEY = 'sd_sansekai_calls';
let queue = Promise.resolve();

function recentStamps() {
  const now = Date.now();
  return (store.get(STAMPS_KEY) || []).filter((t) => now - t < WINDOW_MS);
}

function throttled(task) {
  const run = async () => {
    for (;;) {
      const stamps = recentStamps();
      if (stamps.length < MAX_PER_WINDOW) {
        store.set(STAMPS_KEY, [...stamps, Date.now()]);
        return task();
      }
      const wait = WINDOW_MS - (Date.now() - stamps[0]) + 250;
      await new Promise((r) => setTimeout(r, wait));
    }
  };
  const result = queue.then(run, run);
  queue = result.catch(() => {});
  return result;
}

// ── Cached GET against Sansekai ──
const memoryCache = new Map();

async function sansekai(path, ttlMs = 10 * 60_000) {
  const cacheKey = `sd_cache:${path}`;
  const hit = memoryCache.get(cacheKey) || store.get(cacheKey, sessionStorage);
  if (hit && hit.expires > Date.now()) return hit.data;

  const blocked = sansekaiBlockedUntil();
  if (blocked) throw new SourceUnavailableError('Short dramas are paused for a bit. Try again later.', blocked);

  return throttled(async () => {
    const res = await fetch(SANSEKAI + path);
    if (res.status === 429) {
      markBlocked(70_000);
      throw new SourceUnavailableError('Short dramas hit their limit. Try again in a minute.', Date.now() + 70_000);
    }
    if (res.status === 403) {
      markBlocked(24 * 60 * 60_000);
      throw new SourceUnavailableError('The short drama source has blocked this network.');
    }
    if (!res.ok) throw new Error(`Short drama source error ${res.status}`);
    const data = await res.json();
    const entry = { data, expires: Date.now() + ttlMs };
    memoryCache.set(cacheKey, entry);
    store.set(cacheKey, entry, sessionStorage);
    return data;
  });
}

// ── Response-shape helpers (upstream formats vary and change) ──
const pick = (obj, keys) => {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return undefined;
};

// Walk any JSON value, calling visit(obj) for every plain object.
function walk(node, visit, depth = 0) {
  if (!node || depth > 8) return;
  if (Array.isArray(node)) { node.forEach((n) => walk(n, visit, depth + 1)); return; }
  if (typeof node === 'object') {
    visit(node);
    Object.values(node).forEach((v) => walk(v, visit, depth + 1));
  }
}

// Collect normalised drama cards from any response that contains them.
function collectDramas(json, provider, { id, title, cover, episodes, desc }) {
  const seen = new Set();
  const out = [];
  walk(json, (o) => {
    const itemId = pick(o, id);
    const itemTitle = pick(o, title);
    if (itemId == null || !itemTitle || typeof itemTitle !== 'string') return;
    const key = String(itemId);
    if (seen.has(key)) return;
    seen.add(key);
    out.push({
      provider,
      id: key,
      title: itemTitle.trim(),
      cover: pick(o, cover) || null,
      episodes: Number(pick(o, episodes)) || null,
      description: pick(o, desc) || '',
    });
  });
  return out;
}

const VIDEO_RE = /^https?:\/\/[^\s"]+?(\.m3u8|\.mp4|mime_type=video_mp4)/i;

// Find the best playable URL anywhere in a response. Prefers H.264 (plays
// everywhere) and HLS over plain MP4.
function findVideoUrl(json, preferredKeys = []) {
  const candidates = [];
  walk(json, (o) => {
    for (const k of preferredKeys) {
      if (typeof o[k] === 'string' && o[k].startsWith('http')) candidates.push({ url: o[k], score: 100 });
    }
    const h264 = /h264/i.test(String(o.encode || o.codec || ''));
    for (const [k, v] of Object.entries(o)) {
      if (typeof v !== 'string' || !VIDEO_RE.test(v)) continue;
      let score = 10;
      if (h264 || /h264/i.test(k)) score += 20;
      if (/h265|hevc/i.test(k) || /h265|hevc/i.test(String(o.encode || ''))) score -= 15;
      if (/\.m3u8/i.test(v)) score += 5;
      candidates.push({ url: v, score });
    }
  });
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0]?.url || null;
}

function findSubtitle(json) {
  let found = null;
  walk(json, (o) => {
    if (found) return;
    const url = pick(o, ['subtitleUrl', 'subtitle_url', 'url', 'vtt']);
    const lang = String(pick(o, ['subtitleLanguage', 'captionLanguage', 'language', 'lang']) || '');
    if (typeof url === 'string' && /\.(vtt|srt)(\?|$)/i.test(url) && (!lang || /en/i.test(lang))) found = url;
  });
  return found;
}

// ── Providers ──
const q = encodeURIComponent;

export const PROVIDERS = [
  {
    id: 'reelshort',
    label: 'ReelShort',
    homePath: `/reelshort/homepage?lang=${LANG}`,
    searchPath: (term) => `/reelshort/search?query=${q(term)}&page=1&lang=${LANG}`,
    fields: { id: ['book_id'], title: ['book_title'], cover: ['book_pic'], episodes: ['chapter_count'], desc: ['special_desc', 'description'] },
    detailPath: (id) => `/reelshort/get-detail?bookId=${q(id)}&lang=${LANG}`,
    episodePath: (id, n) => `/reelshort/get-episode?bookId=${q(id)}&episodeNumber=${n}&lang=${LANG}`,
  },
  {
    id: 'netshort',
    label: 'NetShort',
    homePath: `/netshort/theaters?lang=${LANG}`,
    searchPath: (term) => `/netshort/search?query=${q(term)}&lang=${LANG}`,
    fields: { id: ['shortPlayId'], title: ['shortPlayName', 'title'], cover: ['shortPlayCover', 'groupShortPlayCover', 'cover'], episodes: ['totalEpisode', 'totalEpisodes'], desc: ['shotIntroduce', 'introduce'] },
    detailPath: (id) => `/netshort/detail?shortPlayId=${q(id)}&lang=${LANG}`,
    episodePath: (id, n) => `/netshort/get-episode?shortPlayId=${q(id)}&episodeNumber=${n}&lang=${LANG}`,
    videoKeys: ['playVoucher', 'playVoucherBak'],
  },
  {
    id: 'freereels',
    label: 'FreeReels',
    homePath: `/freereels/homepage?lang=${LANG}`,
    searchPath: (term) => `/freereels/search?query=${q(term)}&lang=${LANG}`,
    fields: { id: ['key'], title: ['title', 'name'], cover: ['cover'], episodes: ['episode_count'], desc: ['desc', 'description'] },
    // One call returns the drama and every episode's stream
    detailPath: (id) => `/freereels/detailAndAllEpisode?key=${q(id)}&lang=${LANG}`,
    episodesInDetail: true,
    videoKeys: ['external_audio_h264_m3u8', 'video_url', 'videoUrl'],
  },
  {
    id: 'pinedrama',
    label: 'PineDrama',
    homePath: `/pinedrama/trending?lang=${LANG}`,
    searchPath: (term) => `/pinedrama/search?query=${q(term)}&lang=${LANG}`,
    fields: { id: ['collection_id'], title: ['title'], cover: ['cover'], episodes: ['total_episodes'], desc: ['desc', 'description', 'intro'] },
    detailPath: (id) => `/pinedrama/detail?collection_id=${q(id)}&lang=${LANG}`,
    episodePath: (id, n) => `/pinedrama/get-episode?collection_id=${q(id)}&episodeNumber=${n}&lang=${LANG}`,
    videoKeys: ['best_url'],
  },
];

export const providerById = (id) => PROVIDERS.find((p) => p.id === id);

export async function listDramas(providerId) {
  const p = providerById(providerId);
  const json = await sansekai(p.homePath);
  return collectDramas(json, p.id, p.fields).filter((d) => d.cover);
}

export async function searchDramas(providerId, term) {
  const p = providerById(providerId);
  const json = await sansekai(p.searchPath(term), 5 * 60_000);
  return collectDramas(json, p.id, p.fields);
}

export async function getDrama(providerId, id) {
  const p = providerById(providerId);
  const json = await sansekai(p.detailPath(id), 30 * 60_000);
  const info = collectDramas(json, p.id, p.fields).find((d) => d.id === String(id))
    || collectDramas(json, p.id, p.fields)[0] || { provider: p.id, id: String(id), title: 'Short drama' };

  // Episode list: explicit array if the response has one, else 1..count
  let episodes = [];
  if (p.episodesInDetail) {
    walk(json, (o) => {
      if (episodes.length || !Array.isArray(o.episodes) && !Array.isArray(o.episode_list)) return;
      const list = o.episodes || o.episode_list;
      episodes = list.map((ep, i) => ({
        number: Number(pick(ep, ['index', 'episode', 'episodeNo'])) || i + 1,
        url: findVideoUrl(ep, p.videoKeys),
        subtitle: findSubtitle(ep),
      }));
    });
  }
  const count = episodes.length || info.episodes || Number(pick(json, ['totalEpisode', 'chapter_count', 'total_episodes'])) || 1;
  if (!episodes.length) episodes = Array.from({ length: count }, (_, i) => ({ number: i + 1 }));

  return { ...info, description: info.description || pick(json, ['shotIntroduce', 'special_desc', 'desc']) || '', episodes };
}

export async function getEpisodeStream(providerId, id, episode) {
  const p = providerById(providerId);
  if (episode.url) return { url: episode.url, subtitle: episode.subtitle || null };
  if (!p.episodePath) throw new Error('This episode has no stream');
  const json = await sansekai(p.episodePath(id, episode.number), 8 * 60_000);
  const url = findVideoUrl(json, p.videoKeys);
  if (!url) throw new Error('This episode has no playable stream. It may be locked in the original app.');
  return { url, subtitle: findSubtitle(json) };
}

// ── Dailymotion fallback (portrait uploads only) ──
const DM_FIELDS = 'id,title,thumbnail_720_url,thumbnail_360_url,duration,views_total,description,aspect_ratio,allow_embed';

// Dailymotion descriptions arrive as HTML
function plainText(html) {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html.replace(/<br\s*\/?>/gi, '\n'), 'text/html');
  return (doc.body.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
}
export const DM_TOPICS = [
  { id: 'all',      label: 'All',      query: 'short drama full episode' },
  { id: 'romance',  label: 'Romance',  query: 'short drama romance full episode' },
  { id: 'revenge',  label: 'Revenge',  query: 'short drama revenge full episode' },
  { id: 'ceo',      label: 'Billionaire', query: 'short drama billionaire ceo full' },
  { id: 'fantasy',  label: 'Fantasy',  query: 'short drama fantasy full episode' },
];

export async function listDailymotionPortrait(query, page = 1) {
  const url = new URL('https://api.dailymotion.com/videos');
  url.search = new URLSearchParams({ search: query, fields: DM_FIELDS, limit: '40', page: String(page), sort: 'relevance' });
  const res = await fetch(url);
  if (!res.ok) throw new Error('Dailymotion is unavailable');
  const data = await res.json();
  const items = (data.list || [])
    // Portrait only, and only uploads the owner allows to be embedded
    .filter((v) => v.aspect_ratio && v.aspect_ratio < 0.9 && v.allow_embed !== false)
    .map((v) => ({
      provider: 'dailymotion',
      id: v.id,
      title: v.title,
      cover: v.thumbnail_720_url || v.thumbnail_360_url,
      duration: v.duration,
      views: v.views_total,
      description: plainText(v.description),
    }));
  return { items, hasMore: !!data.has_more };
}

export async function getDailymotionVideo(id) {
  const res = await fetch(`https://api.dailymotion.com/video/${encodeURIComponent(id)}?fields=${DM_FIELDS}`);
  if (!res.ok) throw new Error('Video not found');
  const v = await res.json();
  return { provider: 'dailymotion', id: v.id, title: v.title, cover: v.thumbnail_720_url || v.thumbnail_360_url, duration: v.duration, views: v.views_total, description: plainText(v.description) };
}
