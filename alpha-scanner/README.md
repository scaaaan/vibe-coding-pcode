# alpha::scnr

**Live crypto momentum scanner.** Bloomberg-terminal aesthetic, mobile-first, vanilla-JS, deploys to Vercel with zero config.

Single-page web app that pulls live data from CoinGecko (top 250) and grades each coin 0–100 on a confluence of 1h / 24h / 7d price action, volume-to-mcap ratio, and small-cap weighting. Five scanner tabs slice the same dataset different ways; six filter chips narrow by chain or category.

![alpha::scnr](https://img.shields.io/badge/built-vanilla_js-ff9500?style=flat-square) ![vite](https://img.shields.io/badge/vite-5.x-646cff?style=flat-square) ![bundle](https://img.shields.io/badge/bundle-%3C50KB-00ff7b?style=flat-square)

---

## Quick start

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

```bash
npm run build      # outputs to ./dist
npm run preview    # serves the built bundle locally
```

## Deploy

### Vercel (recommended — zero config)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone)

```bash
npm i -g vercel
vercel              # first run links the project
vercel --prod       # deploy to production
```

`vercel.json` already specifies `framework: vite`, `outputDirectory: dist`.

### Netlify

```bash
npm run build
# drag-drop ./dist into Netlify, or:
netlify deploy --dir=dist --prod
```

### Any static host

`npm run build` and serve `./dist`.

---

## Scanner tabs

| Tab        | Logic                                                                 |
| ---------- | --------------------------------------------------------------------- |
| GAINERS    | Top 24h % movers · min $1M 24h volume · top 50                        |
| TRENDING   | CoinGecko `/search/trending` hydrated with full market data            |
| LOW CAP    | $1M–$100M market cap · sorted by momentum score                       |
| VOL SURGE  | Highest 24h volume / market cap ratio · min $500K vol                  |
| LOSERS     | Bottom 24h % movers · min $1M 24h volume · top 50                      |

## Filter chips

`ALL · SOLANA · BNB · ETH · BASE · MEMES · AI`

Chain filters use a curated allow-list of CoinGecko coin IDs (see `src/filters.js`). Memes / AI filters do keyword scan on `id + symbol + name`.

## Momentum score (0–100)

See `src/scoring.js`. Composition:

```
base                       50
24h trend           ±25    (24h % × 0.5, clamped)
1h acceleration     ±15    (1h % × 1.5, clamped)
volume / mcap       0..20  (>1: +20, >0.5: +15, >0.2: +10, >0.1: +5)
7d confirmation     ±10    (7d % × 0.2, clamped)
small-cap bonus     +3/+5  (<200M / <50M)
```

Result is clamped to `[0, 100]`.

Signal interpretation:

- **75+** STRONG MOMENTUM — high confluence, watch for continuation
- **60–74** BUILDING MOMENTUM — positive setup, await confirmation
- **40–59** NEUTRAL — no clear edge
- **<40** WEAK / FADING — bearish indicators

---

## API rate limits

The CoinGecko free tier allows ~10–30 calls/min and is bursty. This app makes **2 calls per refresh** (markets + trending), refreshes every 90 seconds, **pauses while the browser tab is hidden** (Page Visibility API), and caches the latest response to `localStorage`. On 429 it auto-retries once after a 2.5s backoff.

If you hit limits repeatedly, slow the refresh:

```js
// src/app.js
const REFRESH_MS = 90_000;   // bump to 180_000 or higher
```

DexScreener is wired up as a secondary source (`src/api.js`, `fetchDexPairs`) but is not used by default in v1. Hook it into a new tab if you want fresh DEX launches (see *customization* below).

---

## Customization

### Add a new scanner tab

1. Add to `TABS` in `src/ui/tabs.js`:
   ```js
   { id: 'highvol', label: 'WHALE' }
   ```
2. Add a key to the initial state object in `src/app.js`:
   ```js
   data: { ..., highvol: [] }
   ```
3. Add a slice/sort block to `recompute()` in `src/app.js`.

### Add a new filter chip

1. Add to `FILTERS` in `src/filters.js`.
2. Add a `case` to `applyFilter()` — either a Set of coin IDs (chain) or a keyword list (category).

### Tweak the momentum algorithm

Edit `src/scoring.js`. The constants are intentionally readable — change weights, add timeframes, swap in your own factors.

### Theme

CSS variables at the top of `src/styles.css`. Swap `--amber` to change the accent color throughout. The base palette is tuned for OLED phones (pure black background, high-contrast amber/green/red).

---

## Project structure

```
alpha-scanner/
├── index.html
├── package.json
├── vite.config.js
├── vercel.json
├── .gitignore
├── .env.example
├── README.md
└── src/
    ├── styles.css
    ├── app.js               # orchestrator + state
    ├── api.js               # CoinGecko + DexScreener clients
    ├── scoring.js           # momentum algorithm
    ├── formatters.js        # price / big-number / pct / time
    ├── filters.js           # chain & category filtering
    └── ui/
        ├── ticker.js        # scrolling marquee
        ├── tabs.js          # tab + chip renderers
        ├── coinList.js      # virtualized-friendly list
        └── detailModal.js   # bottom-sheet detail
```

---

## Tech notes

- **Vite** for dev server + bundling. No runtime deps in the shipped bundle.
- **Single state object** — `state.tab`, `state.filter`, `state.data`, `state.loading`, `state.lastUpdate`. Every change calls `render()`.
- **One API pull per refresh** — 250 coins client-side-sliced into 5 tabs.
- **Page Visibility API** stops the timer when the tab is backgrounded.
- **localStorage** caches the last good response so the UI shows data instantly on subsequent loads and during transient outages (stale indicator turns amber).
- **Mobile-first** — 13px base, 44px tap targets, no hover-only states, safe-area-inset support.

---

## Disclaimer

This is a market data viewer for educational and research purposes only. **None of this is financial advice.** Crypto markets are extremely volatile and the momentum score is a heuristic, not a recommendation. Do your own research. You can lose 100% of your capital.

---

## License

MIT
