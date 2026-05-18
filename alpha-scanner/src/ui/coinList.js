import { fmtPrice, fmtBig, fmtPct, fmtRank } from '../formatters.js';
import { calcMomentum } from '../scoring.js';

/**
 * Render a list of coins into `host`. Uses a single innerHTML write
 * for fastest paint, with one delegated click listener per host
 * (installed once via the dataset.boundClick flag).
 */
export function renderCoinList(host, coins, opts = {}) {
  const { onSelect, loading } = opts;

  host.classList.toggle('is-loading', !!loading);

  if (!coins || coins.length === 0) {
    if (loading) {
      // Render shimmer skeletons
      host.innerHTML = Array.from({ length: 8 })
        .map(() => '<div class="sk-row"></div>')
        .join('');
    } else {
      host.innerHTML = '';
    }
    return;
  }

  const html = coins.map((c, idx) => rowHTML(c, idx + 1)).join('');
  host.innerHTML = html;

  // Bind delegated click only once per host
  if (!host.dataset.boundClick) {
    host.addEventListener('click', (e) => {
      const row = e.target.closest('.row');
      if (!row) return;
      const id = row.dataset.id;
      onSelect && onSelect(id);
    });
    // Keyboard activation
    host.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const row = e.target.closest('.row');
      if (!row) return;
      e.preventDefault();
      onSelect && onSelect(row.dataset.id);
    });
    host.dataset.boundClick = '1';
  }
}

function rowHTML(c, displayRank) {
  const score = calcMomentum(c);
  const ch24 = c.price_change_percentage_24h;
  const dir = ch24 >= 0 ? 'up' : 'down';
  const hot = score >= 70 ? ' is-hot' : '';
  const rank = c.market_cap_rank
    ? fmtRank(c.market_cap_rank)
    : String(displayRank).padStart(2, '0');
  const name = c.name || '';
  const sym = (c.symbol || '').toUpperCase();

  return `
    <div class="row${hot}" role="listitem" tabindex="0" data-id="${esc(c.id)}" aria-label="${esc(sym)} ${esc(name)}, score ${score}">
      <span class="row-rank">${rank}</span>
      <div class="row-id">
        <div class="row-line1">
          <span class="row-sym">${esc(sym)}</span>
          <span class="row-name">${esc(name)}</span>
        </div>
        <div class="row-line2">
          <span class="row-price">${fmtPrice(c.current_price)}</span>
          <span class="row-sep">·</span>
          <span class="row-vol">${fmtBig(c.total_volume)}</span>
          <span class="row-sep">·</span>
          <span class="row-pct ${dir}">${fmtPct(ch24)}</span>
        </div>
      </div>
      <div class="row-right">
        <span class="row-score">${score}</span>
        <span class="row-bar"><span class="row-bar-fill" style="--w:${score}%"></span></span>
        <span class="row-score-lbl">MOM</span>
      </div>
    </div>
  `;
}

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
