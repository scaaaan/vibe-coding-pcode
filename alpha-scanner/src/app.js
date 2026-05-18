/**
 * alpha::scnr — main orchestrator
 *
 * Single state object. UI is re-rendered from state on every change.
 * Live data refresh every 90s; paused when the tab is hidden
 * (Page Visibility API) to respect free CoinGecko rate limits.
 */

import { fetchAll, loadCache } from './api.js';
import { calcMomentum } from './scoring.js';
import { applyFilter } from './filters.js';
import { fmtTime } from './formatters.js';

import { TABS, renderTabs, renderChips } from './ui/tabs.js';
import { renderTicker } from './ui/ticker.js';
import { renderCoinList } from './ui/coinList.js';
import { mountModal, openModal, closeModal } from './ui/detailModal.js';

const REFRESH_MS = 90_000;

const state = {
  tab: 'gainers',
  filter: 'all',
  data: {
    gainers: [],
    trending: [],
    lowcap: [],
    volume: [],
    losers: [],
    all: [],
  },
  rawTrendingIds: [],
  loading: false,
  lastUpdate: null,
  stale: false,
  error: null,
};

// ---------- DOM handles -------------------------------------------------------

const el = {
  ts: document.getElementById('ts'),
  liveBadge: document.querySelector('.live'),
  tickerTrack: document.getElementById('ticker-track'),
  tabs: document.getElementById('tabs'),
  chips: document.getElementById('chips'),
  list: document.getElementById('list'),
  empty: document.getElementById('empty'),
  err: document.getElementById('err'),
  errSub: document.getElementById('err-sub'),
  errRetry: document.getElementById('err-retry'),
  foot: document.getElementById('foot'),
  fab: document.getElementById('fab'),
  modal: document.getElementById('modal'),
};

mountModal(el.modal);

// ---------- derive tabs from market data --------------------------------------

function recompute() {
  const all = state.data.all || [];
  if (all.length === 0) {
    for (const t of TABS) state.data[t.id] = [];
    return;
  }

  // GAINERS — top by 24h %, min $1M vol, top 50
  state.data.gainers = [...all]
    .filter(
      (c) =>
        (c.total_volume || 0) >= 1_000_000 &&
        c.price_change_percentage_24h != null
    )
    .sort(
      (a, b) =>
        (b.price_change_percentage_24h || 0) -
        (a.price_change_percentage_24h || 0)
    )
    .slice(0, 50);

  // LOSERS — bottom by 24h %, min $1M vol
  state.data.losers = [...all]
    .filter(
      (c) =>
        (c.total_volume || 0) >= 1_000_000 &&
        c.price_change_percentage_24h != null
    )
    .sort(
      (a, b) =>
        (a.price_change_percentage_24h || 0) -
        (b.price_change_percentage_24h || 0)
    )
    .slice(0, 50);

  // LOW CAP — $1M-$100M mcap, sorted by momentum
  state.data.lowcap = [...all]
    .filter(
      (c) =>
        c.market_cap != null &&
        c.market_cap >= 1_000_000 &&
        c.market_cap <= 100_000_000
    )
    .map((c) => ({ ...c, __score: calcMomentum(c) }))
    .sort((a, b) => b.__score - a.__score)
    .slice(0, 50);

  // VOL SURGE — highest vol/mcap ratio, min $500K vol to filter dust
  state.data.volume = [...all]
    .filter(
      (c) =>
        c.market_cap > 0 &&
        (c.total_volume || 0) >= 500_000
    )
    .map((c) => ({ ...c, __ratio: c.total_volume / c.market_cap }))
    .sort((a, b) => b.__ratio - a.__ratio)
    .slice(0, 50);

  // TRENDING — CG trending ids, hydrated with full market data
  if (state.rawTrendingIds.length > 0) {
    const byId = new Map(all.map((c) => [c.id, c]));
    state.data.trending = state.rawTrendingIds
      .map((id) => byId.get(id))
      .filter(Boolean);
    // For trending coins NOT in top-250, we still want to show them with
    // whatever bare info we have — but we only have full data for top-250.
    // Skip the unmatched silently.
  }
}

// ---------- render -----------------------------------------------------------

function render() {
  // Header timestamp / live indicator
  el.ts.textContent = fmtTime(state.lastUpdate);
  el.liveBadge.classList.toggle('is-stale', state.stale);
  el.liveBadge.querySelector('.live-txt').textContent = state.stale
    ? 'STALE'
    : 'LIVE';

  // Ticker
  renderTicker(el.tickerTrack, state.data.all);

  // Tabs + chips
  renderTabs(el.tabs, state, onSelectTab);
  renderChips(el.chips, state, onSelectFilter);

  // Error state takes priority
  if (state.error && state.data.all.length === 0) {
    el.list.innerHTML = '';
    el.empty.hidden = true;
    el.err.hidden = false;
    el.errSub.textContent =
      state.error.message?.includes('429') || state.error.message?.includes('rate')
        ? 'Rate-limited by CoinGecko. Wait a minute and retry.'
        : 'Could not reach the market feed. Check connection and retry.';
    el.foot.textContent = '';
    return;
  }
  el.err.hidden = true;

  // Current tab + filter
  const tabCoins = state.data[state.tab] || [];
  const filtered = applyFilter(tabCoins, state.filter);

  renderCoinList(el.list, filtered, {
    onSelect: onSelectCoin,
    loading: state.loading && filtered.length === 0,
  });

  // Empty state
  el.empty.hidden = filtered.length > 0 || (state.loading && state.data.all.length === 0);

  // Footer
  if (state.data.all.length > 0) {
    el.foot.innerHTML = `
      ${state.data.all.length} coins scanned · refresh every ${REFRESH_MS / 1000}s
      <br/>not financial advice — markets carry risk
    `;
  } else {
    el.foot.textContent = '';
  }
}

// ---------- handlers ---------------------------------------------------------

function onSelectTab(id) {
  if (state.tab === id) return;
  state.tab = id;
  render();
  window.scrollTo({ top: 0, behavior: 'auto' });
}

function onSelectFilter(id) {
  state.filter = id;
  render();
}

function onSelectCoin(id) {
  const coin =
    state.data.all.find((c) => c.id === id) ||
    state.data[state.tab].find((c) => c.id === id);
  if (coin) openModal(coin);
}

// ---------- data lifecycle ---------------------------------------------------

async function refresh({ silent = false } = {}) {
  state.loading = true;
  state.error = null;
  el.fab.classList.add('is-loading');
  el.list.setAttribute('aria-busy', 'true');
  if (!silent && state.data.all.length === 0) render();

  try {
    const { markets, trending, time } = await fetchAll();
    state.data.all = Array.isArray(markets) ? markets : [];
    state.rawTrendingIds = trending?.coins
      ? trending.coins.map((c) => c.item?.id).filter(Boolean)
      : [];
    state.lastUpdate = time;
    state.stale = false;
    recompute();
  } catch (err) {
    console.warn('[alpha::scnr] refresh failed:', err);
    state.error = err;
    // Fall back to cached data if we have any
    if (state.data.all.length === 0) {
      const cache = loadCache();
      if (cache && cache.markets) {
        state.data.all = cache.markets;
        state.rawTrendingIds = cache.trending?.coins
          ? cache.trending.coins.map((c) => c.item?.id).filter(Boolean)
          : [];
        state.lastUpdate = cache.time;
        state.stale = true;
        state.error = null; // we have *something* to show
        recompute();
      }
    } else {
      state.stale = true;
    }
  } finally {
    state.loading = false;
    el.fab.classList.remove('is-loading');
    el.list.setAttribute('aria-busy', 'false');
    render();
  }
}

// ---------- auto-refresh + page visibility -----------------------------------

let refreshTimer = null;
function startTimer() {
  stopTimer();
  refreshTimer = setInterval(() => {
    if (document.visibilityState === 'visible') refresh({ silent: true });
  }, REFRESH_MS);
}
function stopTimer() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    // If data is older than REFRESH_MS, refresh immediately on focus
    const age = state.lastUpdate ? Date.now() - state.lastUpdate.getTime() : Infinity;
    if (age > REFRESH_MS) refresh({ silent: true });
    startTimer();
  } else {
    stopTimer();
  }
});

// ---------- wire static controls ---------------------------------------------

el.fab.addEventListener('click', () => {
  if (state.loading) return;
  refresh();
});

el.errRetry.addEventListener('click', () => {
  refresh();
});

// Close modal also when tapping anywhere it routes to
window.addEventListener('hashchange', () => closeModal());

// ---------- boot -------------------------------------------------------------

(function boot() {
  // Render with cached data immediately if present
  const cache = loadCache();
  if (cache && cache.markets) {
    state.data.all = cache.markets;
    state.rawTrendingIds = cache.trending?.coins
      ? cache.trending.coins.map((c) => c.item?.id).filter(Boolean)
      : [];
    state.lastUpdate = cache.time;
    state.stale = true;
    recompute();
  }
  render();
  refresh();
  startTimer();
})();
