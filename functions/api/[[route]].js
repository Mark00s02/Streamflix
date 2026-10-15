import { Hono } from 'hono'
import { handle } from 'hono/cloudflare-pages'
import { cors } from 'hono/cors'
import { sign, verify } from 'hono/jwt'

const app = new Hono().basePath('/api')

app.use('*', cors())

app.onError((err, c) => {
  console.error(err)
  return c.json({ error: 'Internal server error' }, 500)
})

// ── Password hashing (Web Crypto PBKDF2 — works in Workers) ───
async function hashPassword(password) {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 50000, hash: 'SHA-256' }, key, 256)
  return JSON.stringify({ hash: [...new Uint8Array(bits)], salt: [...salt] })
}

async function verifyPassword(password, stored) {
  const { hash, salt } = JSON.parse(stored)
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: new Uint8Array(salt), iterations: 50000, hash: 'SHA-256' }, key, 256)
  return JSON.stringify([...new Uint8Array(bits)]) === JSON.stringify(hash)
}

// ── Auth middleware ────────────────────────────────────────────
const requireAuth = async (c, next) => {
  const header = c.req.header('Authorization')
  if (!header?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401)
  try {
    const payload = await verify(header.slice(7), c.env.JWT_SECRET)
    c.set('userId', payload.userId)
    await next()
  } catch {
    return c.json({ error: 'Invalid token' }, 401)
  }
}

// ── TMDB helper ────────────────────────────────────────────────
const tmdb = async (path, env, params = {}) => {
  const url = new URL(`https://api.themoviedb.org/3${path}`)
  url.searchParams.set('api_key', env.TMDB_API_KEY)
  for (const [k, v] of Object.entries(params)) {
    if (v != null) url.searchParams.set(String(k), String(v))
  }
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`TMDB ${res.status}`)
  return res.json()
}

// ── Health ─────────────────────────────────────────────────────
app.get('/health', (c) => c.json({ status: 'ok' }))

// ── Movies ─────────────────────────────────────────────────────
app.get('/movies/trending', async (c) => {
  const data = await tmdb('/trending/movie/week', c.env, { page: c.req.query('page') || 1 })
  return c.json(data.results)
})

app.get('/movies/genres', async (c) => {
  const data = await tmdb('/genre/movie/list', c.env)
  return c.json(data.genres)
})

app.get('/movies/now-playing', async (c) => {
  const data = await tmdb('/movie/now_playing', c.env, { page: c.req.query('page') || 1 })
  return c.json(data.results)
})

app.get('/movies/top-rated', async (c) => {
  const page = c.req.query('page') || 1
  const data = await tmdb('/movie/top_rated', c.env, { page })
  return c.json({ results: data.results, total_pages: data.total_pages })
})

app.get('/movies/discover', async (c) => {
  const { page = 1, genre, sort_by = 'popularity.desc' } = c.req.query()
  const params = { page, sort_by }
  if (genre) params.with_genres = genre
  const data = await tmdb('/discover/movie', c.env, params)
  return c.json({ results: data.results, total_pages: data.total_pages })
})

app.get('/movies/popular', async (c) => {
  const page = c.req.query('page') || 1
  const data = await tmdb('/movie/popular', c.env, { page })
  return c.json({ results: data.results, page, total_pages: data.total_pages })
})

app.get('/movies/search', async (c) => {
  const q = c.req.query('q')
  if (!q) return c.json({ error: 'Search query required' }, 400)
  const data = await tmdb('/search/movie', c.env, { query: q })
  return c.json(data.results)
})

app.get('/movies/:id', async (c) => {
  const data = await tmdb(`/movie/${c.req.param('id')}`, c.env)
  return c.json(data)
})

// ── TV ─────────────────────────────────────────────────────────
app.get('/tv/trending', async (c) => {
  const data = await tmdb('/trending/tv/week', c.env, { page: c.req.query('page') || 1 })
  return c.json(data.results)
})

// Anime: Japanese animation only, with adult titles (hentai, ecchi, erotic) left out
const ANIME_ADULT_KEYWORDS = [198385, 384581, 195669, 325693, 256466]
const isAnime = (t) => t.genre_ids?.includes(16) && t.original_language === 'ja' && !t.adult

app.get('/tv/anime', async (c) => {
  const { page = 1, genre, sort = 'popular' } = c.req.query()
  const data = await tmdb('/discover/tv', c.env, {
    with_genres: genre ? `16,${genre}` : 16,
    with_original_language: 'ja',
    include_adult: false,
    without_keywords: ANIME_ADULT_KEYWORDS.join('|'),
    sort_by: sort === 'top' ? 'vote_average.desc' : 'popularity.desc',
    'vote_count.gte': sort === 'top' ? 300 : undefined,
    page,
  })
  return c.json({ results: data.results.filter((t) => !t.adult), total_pages: data.total_pages })
})

// Search can't exclude keywords, so check each anime hit's keywords
app.get('/tv/anime/search', async (c) => {
  const { q, page = 1 } = c.req.query()
  if (!q?.trim()) return c.json({ error: 'Query required' }, 400)
  const data = await tmdb('/search/tv', c.env, { query: q.trim(), page, include_adult: false })
  const anime = data.results.filter(isAnime)
  const checked = await Promise.all(anime.map(async (t) => {
    try {
      const kw = await tmdb(`/tv/${t.id}/keywords`, c.env)
      return kw.results?.some((k) => ANIME_ADULT_KEYWORDS.includes(k.id)) ? null : t
    } catch { return t }
  }))
  return c.json({ results: checked.filter(Boolean), total_pages: data.total_pages })
})

app.get('/tv/popular', async (c) => {
  const page = c.req.query('page') || 1
  const data = await tmdb('/tv/popular', c.env, { page })
  return c.json({ results: data.results, total_pages: data.total_pages })
})

app.get('/tv/genres', async (c) => {
  const data = await tmdb('/genre/tv/list', c.env)
  return c.json(data.genres)
})

app.get('/tv/discover', async (c) => {
  const { page = 1, genre } = c.req.query()
  const params = { page, sort_by: 'popularity.desc' }
  if (genre) params.with_genres = genre
  const data = await tmdb('/discover/tv', c.env, params)
  return c.json({ results: data.results, total_pages: data.total_pages })
})

app.get('/tv/top-rated', async (c) => {
  const page = c.req.query('page') || 1
  const data = await tmdb('/tv/top_rated', c.env, { page })
  return c.json({ results: data.results, total_pages: data.total_pages })
})

app.get('/tv/search', async (c) => {
  const { q, page = 1 } = c.req.query()
  if (!q?.trim()) return c.json({ error: 'Query required' }, 400)
  const data = await tmdb('/search/tv', c.env, { query: q.trim(), page })
  return c.json({ results: data.results, total_pages: data.total_pages })
})

// specific route must come before /:id
app.get('/tv/:id/season/:seasonNumber', async (c) => {
  const data = await tmdb(`/tv/${c.req.param('id')}/season/${c.req.param('seasonNumber')}`, c.env)
  return c.json(data)
})

app.get('/tv/:id', async (c) => {
  const data = await tmdb(`/tv/${c.req.param('id')}`, c.env)
  return c.json(data)
})

// ── Asian Drama ────────────────────────────────────────────────
const COUNTRY_PARAMS = {
  korean:     { with_origin_country: 'KR', with_original_language: 'ko' },
  thai:       { with_origin_country: 'TH', with_original_language: 'th' },
  chinese:    { with_origin_country: 'CN', with_original_language: 'zh' },
  taiwanese:  { with_origin_country: 'TW' },
  japanese:   { with_origin_country: 'JP', with_original_language: 'ja' },
  vietnamese: { with_origin_country: 'VN', with_original_language: 'vi' },
  filipino:   { with_origin_country: 'PH', with_original_language: 'tl' },
}

const TYPE_PARAMS = {
  drama:  { with_genres: '18' },
  comedy: { with_genres: '35' },
  bl:     { with_keywords: '210024,6647' },
  gl:     { with_keywords: '6648,210025' },
}

app.get('/asiandrama/browse', async (c) => {
  const { country = 'all', type = 'all', page = 1 } = c.req.query()
  const countryExtra = country !== 'all' ? (COUNTRY_PARAMS[country] || {}) : {}
  const typeExtra    = type    !== 'all' ? (TYPE_PARAMS[type]    || {}) : {}
  const fallback     = country !== 'all' && type === 'all' ? { with_genres: '18' } : {}
  const data = await tmdb('/discover/tv', c.env, { sort_by: 'popularity.desc', without_genres: '16', page, ...countryExtra, ...typeExtra, ...fallback })
  return c.json({ results: data.results, total_pages: data.total_pages })
})

// bl/gl must be registered before /:country
app.get('/asiandrama/trending/bl', async (c) => {
  const countryKey = c.req.query('country')
  const extra = countryKey ? (COUNTRY_PARAMS[countryKey] || {}) : {}
  const data = await tmdb('/discover/tv', c.env, { sort_by: 'popularity.desc', without_genres: '16', ...TYPE_PARAMS.bl, page: c.req.query('page') || 1, ...extra })
  return c.json(data.results.slice(0, 20))
})

app.get('/asiandrama/trending/gl', async (c) => {
  const countryKey = c.req.query('country')
  const extra = countryKey ? (COUNTRY_PARAMS[countryKey] || {}) : {}
  const data = await tmdb('/discover/tv', c.env, { sort_by: 'popularity.desc', without_genres: '16', ...TYPE_PARAMS.gl, page: c.req.query('page') || 1, ...extra })
  return c.json(data.results.slice(0, 20))
})

app.get('/asiandrama/trending/:country', async (c) => {
  const cp = COUNTRY_PARAMS[c.req.param('country')]
  if (!cp) return c.json({ error: 'Unknown country' }, 400)
  const data = await tmdb('/discover/tv', c.env, { sort_by: 'popularity.desc', without_genres: '16', ...cp, ...TYPE_PARAMS.drama, page: c.req.query('page') || 1 })
  return c.json(data.results.slice(0, 20))
})

// Only live-action series from the countries the Asian drama page covers
const ASIAN_COUNTRIES = ['KR', 'JP', 'CN', 'TW', 'HK', 'TH', 'VN', 'PH']
const isAsianDrama = (t) => !t.genre_ids?.includes(16) && t.origin_country?.some((cc) => ASIAN_COUNTRIES.includes(cc))

app.get('/asiandrama/search', async (c) => {
  const { q, page = 1 } = c.req.query()
  if (!q?.trim()) return c.json({ error: 'Query required' }, 400)
  const data = await tmdb('/search/tv', c.env, { query: q.trim(), page, include_adult: true })
  return c.json({ results: data.results.filter(isAsianDrama), total_pages: data.total_pages })
})

// ── Dailymotion ────────────────────────────────────────────────
const DM_FIELDS = 'id,title,thumbnail_360_url,thumbnail_url,duration,views_total,description,created_time'
const DM_CATEGORIES = {
  all:      'short drama episode 1',
  korean:   'korean drama short kdrama',
  chinese:  'chinese drama short cdrama',
  thai:     'thai drama short lakorn',
  romantic: 'romantic short drama love',
  action:   'action short drama thriller',
}

const dmFetch = (params) => {
  const url = new URL('https://api.dailymotion.com/videos')
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v))
  return fetch(url.toString()).then(r => r.json())
}

app.get('/dailymotion/browse', async (c) => {
  const { category = 'all', page = 1 } = c.req.query()
  const data = await dmFetch({ search: DM_CATEGORIES[category] || DM_CATEGORIES.all, fields: DM_FIELDS, limit: 20, page, sort: 'visited' })
  return c.json(data)
})

app.get('/dailymotion/search', async (c) => {
  const { q = 'short drama', page = 1 } = c.req.query()
  const data = await dmFetch({ search: q, fields: DM_FIELDS, limit: 20, page, sort: 'visited' })
  return c.json(data)
})

app.get('/dailymotion/video/:id', async (c) => {
  const url = new URL(`https://api.dailymotion.com/video/${c.req.param('id')}`)
  url.searchParams.set('fields', DM_FIELDS)
  return c.json(await fetch(url.toString()).then(r => r.json()))
})

// ── Short-drama relay (Sansekai) ───────────────────────────────
// Browsers call Sansekai directly; when a viewer's network is rate-limited or
// banned, the frontend falls back to this relay. Sansekai's free tier allows
// ~10 requests/min per IP and bans IPs that go over, so the relay caches hard
// and caps itself at 8 upstream calls a minute per isolate.
const SD_UPSTREAM = 'https://api.sansekai.my.id/api'
const SD_ENDPOINT = /^(reelshort|netshort|freereels|pinedrama)\/(homepage|theaters|trending|search|get-detail|detail|detailAndAllEpisode|get-episode)$/
const SD_PARAMS = ['lang', 'query', 'page', 'bookId', 'shortPlayId', 'key', 'collection_id', 'episodeNumber']
const sdTtl = (endpoint) => ({ search: 600, 'get-episode': 1200, homepage: 1800, theaters: 1800, trending: 1800 })[endpoint] || 6 * 3600
const sdMemory = new Map()
let sdStamps = []
let sdBlockedUntil = 0

app.get('/sd/:provider/:endpoint', async (c) => {
  const { provider, endpoint } = c.req.param()
  if (!SD_ENDPOINT.test(`${provider}/${endpoint}`)) return c.json({ error: 'Unknown short drama endpoint' }, 404)

  const upstream = new URL(`${SD_UPSTREAM}/${provider}/${endpoint}`)
  for (const k of SD_PARAMS) {
    const v = c.req.query(k)
    if (v) upstream.searchParams.set(k, v)
  }
  const key = upstream.toString()
  const ttl = sdTtl(endpoint)
  const respond = (body, hit) => new Response(body, {
    headers: { 'content-type': 'application/json', 'cache-control': `public, max-age=${Math.min(ttl, 600)}`, 'x-sd-cache': hit },
  })

  const mem = sdMemory.get(key)
  if (mem && mem.expires > Date.now()) return respond(mem.body, 'memory')
  const edgeCache = typeof caches !== 'undefined' ? caches.default : null
  const cacheKey = new Request(key)
  const hit = edgeCache && await edgeCache.match(cacheKey)
  if (hit) return respond(await hit.text(), 'edge')

  const now = Date.now()
  if (now < sdBlockedUntil) return c.json({ error: 'Short dramas are paused for a bit. Try again later.', retryAt: sdBlockedUntil }, 429)
  sdStamps = sdStamps.filter((t) => now - t < 60_000)
  if (sdStamps.length >= 8) return c.json({ error: 'Short dramas hit their limit. Try again in a minute.', retryAt: sdStamps[0] + 60_000 }, 429)
  sdStamps.push(now)

  const res = await fetch(key, { headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36' } })
  if (res.status === 429 || res.status === 403) {
    sdBlockedUntil = now + (res.status === 403 ? 15 * 60_000 : 70_000)
    return c.json({ error: 'The short drama source is refusing requests right now.', retryAt: sdBlockedUntil }, 429)
  }
  if (!res.ok) return c.json({ error: `Short drama source error ${res.status}` }, 502)

  const body = await res.text()
  sdMemory.set(key, { body, expires: now + ttl * 1000 })
  if (sdMemory.size > 300) sdMemory.delete(sdMemory.keys().next().value)
  if (edgeCache) {
    c.executionCtx.waitUntil(edgeCache.put(cacheKey, new Response(body, {
      headers: { 'content-type': 'application/json', 'cache-control': `public, max-age=${ttl}` },
    })))
  }
  return respond(body, 'miss')
})

// ── Users (auth) ───────────────────────────────────────────────
app.post('/users/register', async (c) => {
  const { username, email, password } = await c.req.json()
  if (!username || !email || !password) return c.json({ error: 'Missing required fields' }, 400)
  try {
    const hashed = await hashPassword(password)
    await c.env.DB.prepare('INSERT INTO users (username, email, password) VALUES (?, ?, ?)').bind(username, email, hashed).run()
    return c.json({ message: 'User registered successfully' }, 201)
  } catch (err) {
    if (err.message?.includes('UNIQUE')) return c.json({ error: 'Username or email already exists' }, 400)
    throw err
  }
})

app.post('/users/login', async (c) => {
  const { email, password } = await c.req.json()
  if (!email || !password) return c.json({ error: 'Email and password required' }, 400)
  const user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first()
  if (!user || !await verifyPassword(password, user.password)) return c.json({ error: 'Invalid credentials' }, 401)
  const token = await sign(
    { userId: user.id, email: user.email, exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60 },
    c.env.JWT_SECRET
  )
  return c.json({ token, user: { id: user.id, username: user.username, email: user.email } })
})

// ── Watchlist (protected) ──────────────────────────────────────
const mediaTypeOf = (value) => (value === 'tv' ? 'tv' : 'movie')

// One-time migration: older databases have no media_type column and a
// UNIQUE(user_id, movie_id) constraint, so movies and series could collide.
let watchlistSchemaReady = false
const ensureWatchlistSchema = async (c, next) => {
  if (!watchlistSchemaReady) {
    const { results } = await c.env.DB.prepare('PRAGMA table_info(watchlist)').all()
    if (!results.some((col) => col.name === 'media_type')) {
      await c.env.DB.batch([
        c.env.DB.prepare(`CREATE TABLE watchlist_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          movie_id TEXT NOT NULL,
          media_type TEXT NOT NULL DEFAULT 'movie',
          title TEXT, overview TEXT, poster_path TEXT, release_date TEXT, rating REAL,
          added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id),
          UNIQUE(user_id, movie_id, media_type)
        )`),
        c.env.DB.prepare(`INSERT INTO watchlist_new (user_id, movie_id, media_type, title, overview, poster_path, release_date, rating, added_at)
          SELECT user_id, movie_id, 'movie', title, overview, poster_path, release_date, rating, added_at FROM watchlist`),
        c.env.DB.prepare('DROP TABLE watchlist'),
        c.env.DB.prepare('ALTER TABLE watchlist_new RENAME TO watchlist'),
      ])
    }
    watchlistSchemaReady = true
  }
  await next()
}

const watchlist = new Hono()
watchlist.use('*', requireAuth, ensureWatchlistSchema)

watchlist.get('/', async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT movie_id AS id, media_type, title, overview, poster_path, release_date, rating, added_at
     FROM watchlist WHERE user_id = ? ORDER BY added_at DESC`
  ).bind(c.get('userId')).all()
  return c.json(results)
})

watchlist.post('/', async (c) => {
  const { movieId, title, overview, posterPath, releaseDate, rating, mediaType } = await c.req.json()
  if (!movieId) return c.json({ error: 'Movie ID required' }, 400)
  try {
    await c.env.DB.prepare(
      'INSERT INTO watchlist (user_id, movie_id, media_type, title, overview, poster_path, release_date, rating) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(c.get('userId'), String(movieId), mediaTypeOf(mediaType), title, overview, posterPath, releaseDate, rating || 0).run()
    return c.json({ message: 'Added to watchlist' }, 201)
  } catch (err) {
    if (err.message?.includes('UNIQUE')) return c.json({ error: 'Already in watchlist' }, 400)
    throw err
  }
})

watchlist.delete('/:movieId', async (c) => {
  await c.env.DB.prepare('DELETE FROM watchlist WHERE user_id = ? AND movie_id = ? AND media_type = ?')
    .bind(c.get('userId'), c.req.param('movieId'), mediaTypeOf(c.req.query('type'))).run()
  return c.json({ message: 'Removed from watchlist' })
})

app.route('/watchlist', watchlist)

export const onRequest = handle(app)
