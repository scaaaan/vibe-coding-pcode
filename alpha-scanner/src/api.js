/**
 * Data clients — CoinGecko (primary) and DexScreener (secondary).
 *
 * Strategy:
 *   - One CG `/coins/markets` call per refresh (250 coins, all timeframes).
 *   - One CG `/search/trending` call.
 *   - Results cached in-memory + persisted to localStorage so the UI shows
 *     last-known data immediately on load and during transient outages.
 *   - 15s timeout, single retry with backoff on network errors.
 */

const CG_BASE = 'https://api.coingecko.com/api/v3';
const DEX_BASE = 'https://api.dexscreener.com/latest/dex';

const LS_KEY_MARKETS = 'alpha::cache::markets';
const LS_KEY_TRENDING = 'alpha::cache::trending';
const LS_KEY_TIME = 'alpha::cache::time';

// ---------- low-level fetch ---------------------------------------------------

async function fetchJSON(url, { timeout = 15000, retries = 1 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeout);
    try {
      const res = await fetch(url, {
        signal: ctrl.signal,
        headers: { accept: 'application/json' },
      });
      clearTimeout(t);
      if (!res.ok) {
        // 429 = rate-limited. Wait longer before retry.
        if (res.status === 429 && attempt < retries) {
          await sleep(2500);
          continue;
        }
        throw new Error(`HTTP ${res.status}`);
      }
      return await res.json();
    } catch (err) {
      clearTimeout(t);
      lastErr = err;
      if (attempt < retries) await sleep(1200);
    }
  }
  throw lastErr || new Error('fetch failed');
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------- cache helpers -----------------------------------------------------

function saveCache(markets, trending) {
  try {
    localStorage.setItem(LS_KEY_MARKETS, JSON.stringify(markets));
    if (trending) localStorage.setItem(LS_KEY_TRENDING, JSON.stringify(trending));
    localStorage.setItem(LS_KEY_TIME, String(Date.now()));
  } catch (_) {
    /* private mode / quota — ignore */
  }
}

export function loadCache() {
  try {
    const raw = localStorage.getItem(LS_KEY_MARKETS);
    const traw = localStorage.getItem(LS_KEY_TRENDING);
    const time = Number(localStorage.getItem(LS_KEY_TIME) || 0);
    if (!raw) return null;
    return {
      markets: JSON.parse(raw),
      trending: traw ? JSON.parse(traw) : null,
      time: time ? new Date(time) : null,
    };
  } catch (_) {
    return null;
  }
}

// ---------- CoinGecko --------------------------------------------------------

export async function fetchMarkets() {
  const url =
    `${CG_BASE}/coins/markets` +
    '?vs_currency=usd' +
    '&order=market_cap_desc' +
    '&per_page=250' +
    '&page=1' +
    '&sparkline=false' +
    '&price_change_percentage=1h,24h,7d';
  return fetchJSON(url);
}

export async function fetchTrending() {
  return fetchJSON(`${CG_BASE}/search/trending`);
}

/**
 * Unified pull — markets + trending in parallel. Cache on success.
 * Trending may legitimately fail (rate-limit) — we still resolve with markets.
 */
export async function fetchAll() {
  const [markets, trending] = await Promise.allSettled([
    fetchMarkets(),
    fetchTrending(),
  ]);
  if (markets.status !== 'fulfilled') {
    throw markets.reason || new Error('markets unavailable');
  }
  const trendingValue =
    trending.status === 'fulfilled' ? trending.value : null;

  saveCache(markets.value, trendingValue);
  return {
    markets: markets.value,
    trending: trendingValue,
    time: new Date(),
  };
}

// ---------- DexScreener (secondary, used opportunistically) ------------------

export async function fetchDexPairs(query) {
  if (!query) return null;
  const url = `${DEX_BASE}/search?q=${encodeURIComponent(query)}`;
  try {
    return await fetchJSON(url, { timeout: 8000, retries: 0 });
  } catch (_) {
    return null;
  }
}
