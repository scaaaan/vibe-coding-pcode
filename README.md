# alpha::scnr

Real-time crypto momentum scanner. Tracks gainers, trending coins, low-cap movers, volume surges, and losers — all powered by CoinGecko's free API with zero key required.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/scaaaan/vibe-coding-pcode/tree/main/alpha-scanner)

## Quick Start

```bash
npm install && npm run dev
```

Open http://localhost:3000

## Build

```bash
npm run build    # produces dist/
npm run preview  # local preview of production build
```

## Deploy to Vercel

```bash
npm i -g vercel
vercel --cwd alpha-scanner
```

Or push the repo and import on vercel.com — zero config required.

## API Rate Limits

- **CoinGecko Free**: ~10–30 req/min. The app fetches once per 90s and slices all views client-side, so a single page session uses ~1 req/90s.
- **DexScreener**: No documented limit; used only for the DEX pairs tab (if enabled).

## Customization

### Adding a New Tab

1. Add a key to `state.data` in `src/app.js`
2. Add a tab config object in `src/ui/tabs.js`
3. Implement the filter function in `src/filters.js`
4. Add its render logic in `src/ui/coinList.js`

### Adding a New Filter Chip

Edit `FILTERS` in `src/filters.js`:

```js
export const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'mychain', label: 'MyChain', platforms: ['mychain'] },
  // ...
];
```

For category keywords, add a `keywords` array instead of `platforms`.

## Disclaimer

This tool is for informational purposes only. Nothing here constitutes financial advice. Crypto markets are highly volatile — always do your own research before trading.
