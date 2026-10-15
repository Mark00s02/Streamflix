import { movieService, tvService, asianDramaService } from './api';

// Every row that has a "See all" link. `fetch(page)` resolves to
// { items, totalPages } — totalPages is null when the endpoint doesn't say.
const list   = (res) => ({ items: res.data || [], totalPages: null });
const paged  = (res) => ({ items: res.data.results || [], totalPages: res.data.total_pages || null });

export const BROWSE_CATEGORIES = {
  // ── Home ──
  'trending-movies':  { title: 'Trending This Week', mediaType: 'movie', fetch: (p) => movieService.getTrending(p).then(list) },
  'now-playing':      { title: 'Hot Right Now',      mediaType: 'movie', fetch: (p) => movieService.getNowPlaying(p).then(list) },
  'top-rated-movies': { title: 'Top Rated All Time', mediaType: 'movie', fetch: (p) => movieService.getTopRated(p).then(paged) },
  'trending-tv':      { title: 'Trending TV Shows',  mediaType: 'tv',    fetch: (p) => tvService.getTrending(p).then(list) },
  'anime':            { title: 'Popular Anime',      mediaType: 'anime', fetch: (p) => tvService.getAnime(p).then(paged) },
  // ── Anime page ──
  'top-rated-anime':  { title: 'Top rated anime',    mediaType: 'anime', fetch: (p) => tvService.getAnime(p, { sort: 'top' }).then(paged) },
  // ── Asian Drama page ──
  'kdrama':     { title: 'Trending K-Drama',          mediaType: 'tv', fetch: (p) => asianDramaService.trending('korean', p).then(list) },
  'jdrama':     { title: 'Trending J-Drama',          mediaType: 'tv', fetch: (p) => asianDramaService.trending('japanese', p).then(list) },
  'cdrama':     { title: 'Trending C-Drama',          mediaType: 'tv', fetch: (p) => asianDramaService.trending('chinese', p).then(list) },
  'twdrama':    { title: 'Trending Taiwanese Drama',  mediaType: 'tv', fetch: (p) => asianDramaService.trending('taiwanese', p).then(list) },
  'thaidrama':  { title: 'Trending Thai Drama',       mediaType: 'tv', fetch: (p) => asianDramaService.trending('thai', p).then(list) },
  'pinoydrama': { title: 'Trending Filipino Drama',   mediaType: 'tv', fetch: (p) => asianDramaService.trending('filipino', p).then(list) },
  'vndrama':    { title: 'Trending Vietnamese Drama', mediaType: 'tv', fetch: (p) => asianDramaService.trending('vietnamese', p).then(list) },
  'bl':         { title: 'BL / Boys Love',            mediaType: 'tv', fetch: (p) => asianDramaService.trendingBL(null, p).then(list) },
  'gl':         { title: 'GL / Girls Love',           mediaType: 'tv', fetch: (p) => asianDramaService.trendingGL(null, p).then(list) },
};
