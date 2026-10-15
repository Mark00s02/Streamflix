import express from 'express';

// Short-drama relay (Sansekai) — mirrors /api/sd in functions/api/[[route]].js.
// Sansekai's free tier allows ~10 requests/min per IP and bans IPs that go
// over, so responses are cached and upstream calls capped at 8 a minute.
const router = express.Router();
const UPSTREAM = 'https://api.sansekai.my.id/api';
const ENDPOINT = /^(reelshort|netshort|freereels|pinedrama)\/(homepage|theaters|trending|search|get-detail|detail|detailAndAllEpisode|get-episode)$/;
const PARAMS = ['lang', 'query', 'page', 'bookId', 'shortPlayId', 'key', 'collection_id', 'episodeNumber'];
const ttlFor = (endpoint) => ({ search: 600, 'get-episode': 1200, homepage: 1800, theaters: 1800, trending: 1800 })[endpoint] || 6 * 3600;

const cache = new Map();
let stamps = [];
let blockedUntil = 0;

router.get('/:provider/:endpoint', async (req, res) => {
  const { provider, endpoint } = req.params;
  if (!ENDPOINT.test(`${provider}/${endpoint}`)) return res.status(404).json({ error: 'Unknown short drama endpoint' });

  const upstream = new URL(`${UPSTREAM}/${provider}/${endpoint}`);
  for (const k of PARAMS) if (req.query[k]) upstream.searchParams.set(k, String(req.query[k]));
  const key = upstream.toString();

  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return res.type('json').send(hit.body);

  const now = Date.now();
  if (now < blockedUntil) return res.status(429).json({ error: 'Short dramas are paused for a bit. Try again later.', retryAt: blockedUntil });
  stamps = stamps.filter((t) => now - t < 60_000);
  if (stamps.length >= 8) return res.status(429).json({ error: 'Short dramas hit their limit. Try again in a minute.', retryAt: stamps[0] + 60_000 });
  stamps.push(now);

  try {
    const upstreamRes = await fetch(key, { headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0 Safari/537.36' } });
    if (upstreamRes.status === 429 || upstreamRes.status === 403) {
      blockedUntil = now + (upstreamRes.status === 403 ? 15 * 60_000 : 70_000);
      return res.status(429).json({ error: 'The short drama source is refusing requests right now.', retryAt: blockedUntil });
    }
    if (!upstreamRes.ok) return res.status(502).json({ error: `Short drama source error ${upstreamRes.status}` });
    const body = await upstreamRes.text();
    cache.set(key, { body, expires: now + ttlFor(endpoint) * 1000 });
    if (cache.size > 300) cache.delete(cache.keys().next().value);
    res.type('json').send(body);
  } catch (err) {
    console.error('Short drama relay error:', err.message);
    res.status(502).json({ error: 'Could not reach the short drama source' });
  }
});

export default router;
