import { fmtPrice, fmtPct } from '../formatters.js';

/**
 * Build a marquee of the 20 biggest absolute %-change coins.
 * Track is duplicated 2× so the CSS animation loops seamlessly.
 */
export function renderTicker(host, allCoins) {
  if (!host || !allCoins || allCoins.length === 0) {
    host.innerHTML = '';
    return;
  }

  const movers = [...allCoins]
    .filter((c) => c.price_change_percentage_24h != null)
    .sort(
      (a, b) =>
        Math.abs(b.price_change_percentage_24h) -
        Math.abs(a.price_change_percentage_24h)
    )
    .slice(0, 20);

  const itemHTML = (c) => {
    const pct = c.price_change_percentage_24h;
    const dir = pct >= 0 ? 'up' : 'down';
    return `
      <div class="tk-item">
        <span class="tk-sym">${escapeHTML(c.symbol).toUpperCase()}</span>
        <span class="tk-price">${fmtPrice(c.current_price)}</span>
        <span class="tk-pct ${dir}">${fmtPct(pct)}</span>
      </div>
    `;
  };

  const half = movers.map(itemHTML).join('');
  host.innerHTML = half + half; // duplicate for seamless loop
}

function escapeHTML(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
