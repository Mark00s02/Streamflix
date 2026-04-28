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
  const data = await tmdb('/trending/movie/week', c.env)
  return c.json(data.results)
})

app.get('/movies/genres', async (c) => {
  const data = await tmdb('/genre/movie/list', c.env)
  return c.json(data.genres)
})

app.get('/movies/now-playing', async (c) => {
  const data = await tmdb('/movie/now_playing', c.env, { page: 1 })
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
  const data = await tmdb('/trending/tv/week', c.env)
  return c.json(data.results)
})

app.get('/tv/anime', async (c) => {
  const page = c.req.query('page') || 1
  const data = await tmdb('/discover/tv', c.env, {
    with_genres: 16, with_original_language: 'ja', sort_by: 'popularity.desc', page,
  })
  return c.json({ results: data.results, total_pages: data.total_pages })
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
  const data = await tmdb('/discover/tv', c.env, { sort_by: 'popularity.desc', page, ...countryExtra, ...typeExtra, ...fallback })
  return c.json({ results: data.results, total_pages: data.total_pages })
})

// bl/gl must be registered before /:country
app.get('/asiandrama/trending/bl', async (c) => {
  const countryKey = c.req.query('country')
  const extra = countryKey ? (COUNTRY_PARAMS[countryKey] || {}) : {}
  const data = await tmdb('/discover/tv', c.env, { sort_by: 'popularity.desc', ...TYPE_PARAMS.bl, page: 1, ...extra })
  return c.json(data.results.slice(0, 20))
})

app.get('/asiandrama/trending/gl', async (c) => {
  const countryKey = c.req.query('country')
  const extra = countryKey ? (COUNTRY_PARAMS[countryKey] || {}) : {}
  const data = await tmdb('/discover/tv', c.env, { sort_by: 'popularity.desc', ...TYPE_PARAMS.gl, page: 1, ...extra })
  return c.json(data.results.slice(0, 20))
})

app.get('/asiandrama/trending/:country', async (c) => {
  const cp = COUNTRY_PARAMS[c.req.param('country')]
  if (!cp) return c.json({ error: 'Unknown country' }, 400)
  const data = await tmdb('/discover/tv', c.env, { sort_by: 'popularity.desc', ...cp, ...TYPE_PARAMS.drama, page: 1 })
  return c.json(data.results.slice(0, 20))
})

app.get('/asiandrama/search', async (c) => {
  const { q, page = 1 } = c.req.query()
  if (!q?.trim()) return c.json({ error: 'Query required' }, 400)
  const data = await tmdb('/search/tv', c.env, { query: q.trim(), page })
  return c.json({ results: data.results, total_pages: data.total_pages })
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
const watchlist = new Hono()
watchlist.use('*', requireAuth)

watchlist.get('/', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM watchlist WHERE user_id = ? ORDER BY added_at DESC').bind(c.get('userId')).all()
  return c.json(results)
})

watchlist.post('/', async (c) => {
  const { movieId, title, overview, posterPath, releaseDate, rating } = await c.req.json()
  if (!movieId) return c.json({ error: 'Movie ID required' }, 400)
  try {
    await c.env.DB.prepare(
      'INSERT INTO watchlist (user_id, movie_id, title, overview, poster_path, release_date, rating) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(c.get('userId'), String(movieId), title, overview, posterPath, releaseDate, rating || 0).run()
    return c.json({ message: 'Movie added to watchlist' }, 201)
  } catch (err) {
    if (err.message?.includes('UNIQUE')) return c.json({ error: 'Movie already in watchlist' }, 400)
    throw err
  }
})

watchlist.delete('/:movieId', async (c) => {
  await c.env.DB.prepare('DELETE FROM watchlist WHERE user_id = ? AND movie_id = ?')
    .bind(c.get('userId'), c.req.param('movieId')).run()
  return c.json({ message: 'Movie removed from watchlist' })
})

app.route('/watchlist', watchlist)

export const onRequest = handle(app)
