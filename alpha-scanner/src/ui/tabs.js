import { FILTERS } from '../filters.js';

export const TABS = [
  { id: 'gainers',  label: 'GAINERS'  },
  { id: 'trending', label: 'TRENDING' },
  { id: 'lowcap',   label: 'LOW CAP'  },
  { id: 'volume',   label: 'VOL SURGE' },
  { id: 'losers',   label: 'LOSERS'   },
];

export function renderTabs(host, state, onSelect) {
  host.innerHTML = '';
  for (const tab of TABS) {
    const count = (state.data[tab.id] || []).length;
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'tab' + (state.tab === tab.id ? ' is-active' : '');
    el.setAttribute('role', 'tab');
    el.setAttribute('aria-selected', state.tab === tab.id ? 'true' : 'false');
    el.dataset.tab = tab.id;
    el.innerHTML = `
      <span class="tab-lbl">${tab.label}</span>
      <span class="tab-count">${count > 0 ? count : '·'}</span>
    `;
    el.addEventListener('click', () => onSelect(tab.id));
    host.appendChild(el);
  }
}

export function renderChips(host, state, onSelect) {
  host.innerHTML = '';
  for (const f of FILTERS) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'chip' + (state.filter === f.id ? ' is-active' : '');
    el.dataset.filter = f.id;
    el.setAttribute('aria-pressed', state.filter === f.id ? 'true' : 'false');
    el.textContent = f.label;
    el.addEventListener('click', () => onSelect(f.id));
    host.appendChild(el);
  }
}
