// Map a TMDB series episode to a MyAnimeList entry + episode number, which is
// what VidLink's anime player (with sub/dub) needs.
//
// TMDB groups an anime into one show with seasons; MyAnimeList gives each
// season (cour) its own entry. ani.zip links TMDB → MAL and lists each MAL
// episode's season/episode numbers; AniList's relations give the next season.
// Both are free, keyless and allow browser requests.

const CACHE_KEY = 'sf_anime_map_v1';

const readCache = () => {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY)) || {}; } catch { return {}; }
};
const writeCache = (cache) => {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch { /* ignore */ }
};

async function aniZip(query) {
  const res = await fetch(`https://api.ani.zip/mappings?${query}`);
  if (!res.ok) return null;
  return res.json();
}

async function nextSeasonMalId(malId) {
  const res = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      query: 'query ($mal: Int) { Media(idMal: $mal, type: ANIME) { relations { edges { relationType node { idMal format } } } } }',
      variables: { mal: malId },
    }),
  });
  if (!res.ok) return null;
  const edges = (await res.json())?.data?.Media?.relations?.edges || [];
  const sequel = edges.find((e) => e.relationType === 'SEQUEL' && e.node.idMal && ['TV', 'TV_SHORT', 'ONA'].includes(e.node.format));
  return sequel?.node.idMal || null;
}

function findEpisode(entry, season, episode) {
  for (const [key, ep] of Object.entries(entry?.episodes || {})) {
    const number = Number(key);
    if (Number.isInteger(number) && ep.seasonNumber === season && ep.episodeNumber === episode) return number;
  }
  return null;
}

// Resolves to { malId, number } or null when no match can be found.
export async function resolveAnimeEpisode(tmdbId, season, episode) {
  const key = `${tmdbId}:${season}:${episode}`;
  const cache = readCache();
  if (key in cache) return cache[key];

  let result = null;
  try {
    let entry = await aniZip(`themoviedb_id=${encodeURIComponent(tmdbId)}`);
    const baseMal = entry?.mappings?.mal_id;
    if (baseMal) {
      const seen = new Set();
      for (let hop = 0; entry && hop < 8; hop += 1) {
        const malId = entry.mappings?.mal_id;
        if (!malId || seen.has(malId)) break;
        seen.add(malId);
        const number = findEpisode(entry, season, episode);
        if (number) { result = { malId, number }; break; }
        const next = await nextSeasonMalId(malId);
        entry = next ? await aniZip(`mal_id=${next}`) : null;
      }
      // Single-season shows often lack per-episode data; numbering then matches
      if (!result && season === 1) result = { malId: baseMal, number: episode };
    }
  } catch {
    return null; // network trouble: don't cache, try again next time
  }

  cache[key] = result;
  writeCache(cache);
  return result;
}
