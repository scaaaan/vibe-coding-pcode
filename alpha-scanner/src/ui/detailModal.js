import { fmtPrice, fmtBig, fmtPct, fmtSupply, fmtRank } from '../formatters.js';
import { calcMomentum, signal } from '../scoring.js';

let host = null;
let escListener = null;
let lastActiveEl = null;

export function mountModal(rootEl) {
  host = rootEl;
}

export function openModal(coin) {
  if (!host || !coin) return;
  lastActiveEl = document.activeElement;
  const score = calcMomentum(coin);
  const sig = signal(score);
  const ath = coin.ath;
  const fromAth =
    ath && coin.current_price
      ? ((coin.current_price - ath) / ath) * 100
      : null;
  const volRatio =
    coin.market_cap && coin.total_volume
      ? (coin.total_volume / coin.market_cap) * 100
      : null;

  const dir = (v) => (v == null ? '' : v >= 0 ? 'up' : 'down');

  host.hidden = false;
  host.setAttribute('aria-hidden', 'false');
  host.innerHTML = `
    <div class="sheet" role="document">
      <div class="sheet-grab" aria-hidden="true"></div>

      <div class="sheet-hdr">
        <div class="sheet-id">
          <div class="sheet-sym" id="m-name">${esc((coin.symbol || '').toUpperCase())}</div>
          <div class="sheet-name">${esc(coin.name || '')}</div>
          <div class="sheet-rank">RANK #${fmtRank(coin.market_cap_rank)}  ·  SCORE ${score}</div>
        </div>
        <button class="sheet-close" type="button" aria-label="Close" data-close>×</button>
      </div>

      <div class="signal">
        <div class="signal-label">${esc(sig.label)}</div>
        <div class="signal-text">${esc(sig.text)}</div>
      </div>

      <div class="grid">
        <div class="cell">
          <div class="cell-lbl">PRICE</div>
          <div class="cell-val">${fmtPrice(coin.current_price)}</div>
        </div>
        <div class="cell">
          <div class="cell-lbl">24H</div>
          <div class="cell-val ${dir(coin.price_change_percentage_24h)}">${fmtPct(coin.price_change_percentage_24h)}</div>
        </div>
        <div class="cell">
          <div class="cell-lbl">1H</div>
          <div class="cell-val ${dir(coin.price_change_percentage_1h_in_currency)}">${fmtPct(coin.price_change_percentage_1h_in_currency)}</div>
        </div>
        <div class="cell">
          <div class="cell-lbl">7D</div>
          <div class="cell-val ${dir(coin.price_change_percentage_7d_in_currency)}">${fmtPct(coin.price_change_percentage_7d_in_currency)}</div>
        </div>
        <div class="cell">
          <div class="cell-lbl">MCAP</div>
          <div class="cell-val">${fmtBig(coin.market_cap)}</div>
        </div>
        <div class="cell">
          <div class="cell-lbl">VOLUME 24H</div>
          <div class="cell-val">${fmtBig(coin.total_volume)}</div>
        </div>
      </div>

      <div class="rows">
        <div class="info">
          <span class="info-lbl">Vol / MCap</span>
          <span class="info-val">${volRatio == null ? '--' : volRatio.toFixed(2) + '%'}</span>
        </div>
        <div class="info">
          <span class="info-lbl">All-Time High</span>
          <span class="info-val">${fmtPrice(coin.ath)}</span>
        </div>
        <div class="info">
          <span class="info-lbl">% from ATH</span>
          <span class="info-val ${fromAth != null && fromAth < 0 ? 'down' : ''}">${fromAth == null ? '--' : fmtPct(fromAth)}</span>
        </div>
        <div class="info">
          <span class="info-lbl">Circulating</span>
          <span class="info-val">${fmtSupply(coin.circulating_supply)} ${esc((coin.symbol || '').toUpperCase())}</span>
        </div>
        <div class="info">
          <span class="info-lbl">Max Supply</span>
          <span class="info-val">${coin.max_supply ? fmtSupply(coin.max_supply) : '∞'}</span>
        </div>
        <div class="info">
          <span class="info-lbl">ID</span>
          <span class="info-val">${esc(coin.id)}</span>
        </div>
      </div>
    </div>
  `;

  // Wire dismissal
  host.addEventListener('click', onBackdrop);
  escListener = (e) => {
    if (e.key === 'Escape') closeModal();
  };
  document.addEventListener('keydown', escListener);
  document.body.style.overflow = 'hidden';

  // Move focus to close button
  const closeBtn = host.querySelector('[data-close]');
  if (closeBtn) closeBtn.focus();
}

function onBackdrop(e) {
  // Tap on backdrop OR the close button
  if (e.target === host || e.target.matches('[data-close]')) {
    closeModal();
  }
}

export function closeModal() {
  if (!host || host.hidden) return;
  host.removeEventListener('click', onBackdrop);
  if (escListener) {
    document.removeEventListener('keydown', escListener);
    escListener = null;
  }
  host.hidden = true;
  host.setAttribute('aria-hidden', 'true');
  host.innerHTML = '';
  document.body.style.overflow = '';
  if (lastActiveEl && typeof lastActiveEl.focus === 'function') {
    try { lastActiveEl.focus(); } catch (_) {}
  }
}

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
