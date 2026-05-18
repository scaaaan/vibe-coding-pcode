/**
 * Filter chips: `all | solana | bnb | ethereum | base | memes | ai`.
 *
 * CoinGecko's `/coins/markets` endpoint does not return chain info, so we
 * classify chain by a curated set of native/ecosystem coin IDs and known
 * symbols. This is conservative-by-design — the goal is signal, not
 * encyclopedia coverage. Add IDs over time.
 *
 * Memes / AI use keyword scan on id+symbol+name.
 */

export const FILTERS = [
  { id: 'all',      label: 'ALL' },
  { id: 'solana',   label: 'SOLANA' },
  { id: 'bnb',      label: 'BNB' },
  { id: 'ethereum', label: 'ETH' },
  { id: 'base',     label: 'BASE' },
  { id: 'memes',    label: 'MEMES' },
  { id: 'ai',       label: 'AI' },
];

// Native + flagship ecosystem coins per chain.
// Keep as a Set for O(1) lookup. ids are CoinGecko IDs.
const SOLANA_IDS = new Set([
  'solana', 'bonk', 'dogwifcoin', 'jupiter-exchange-solana', 'jito-governance-token',
  'pyth-network', 'render-token', 'raydium', 'helium', 'pengu', 'pudgy-penguins',
  'wen-4', 'book-of-meme', 'cat-in-a-dogs-world', 'popcat', 'mew', 'ponke',
  'fartcoin', 'goatseus-maximus', 'official-trump', 'peanut-the-squirrel',
  'moo-deng', 'chillguy', 'ai16z', 'griffain', 'zerebro', 'arc',
  'tensor', 'drift-protocol', 'kamino', 'marinade', 'orca', 'mango-markets',
]);

const BNB_IDS = new Set([
  'binancecoin', 'pancakeswap-token', 'baby-doge-coin', 'safemoon-2',
  'venus', 'biswap', 'alpaca-finance', 'mobox', 'trust-wallet-token',
  'cheems-2', 'floki', 'dogecoin-20',
]);

const ETHEREUM_IDS = new Set([
  'ethereum', 'staked-ether', 'wrapped-bitcoin', 'shiba-inu', 'uniswap',
  'chainlink', 'pepe', 'mantle', 'aave', 'maker', 'lido-dao', 'arbitrum',
  'optimism', 'curve-dao-token', 'compound-governance-token', 'frax-share',
  'rocket-pool-eth', 'pendle', 'eigenlayer', 'ethena', 'mog-coin', 'spx6900',
  'turbo', 'memecoin-2', 'apecoin', 'shiba-saga', 'fetch-ai', 'singularitynet',
  'ocean-protocol', 'the-graph', 'lido-staked-ether', 'wrapped-steth',
  'rocket-pool', 'usd-coin', 'tether', 'dai', 'frax', 'true-usd',
]);

const BASE_IDS = new Set([
  'aerodrome-finance', 'brett-based', 'degen-base', 'higher', 'toshi',
  'roost-coin', 'mochi-thecatcoin', 'tybg', 'normie', 'morpho', 'doginme',
  'keycat', 'pirate-nation', 'virtual-protocol', 'aixbt', 'luna-by-virtuals',
  'vader-ai-by-virtuals', 'game-by-virtuals', 'g-a-m-e',
]);

const MEME_WORDS = [
  'doge', 'shib', 'pepe', 'floki', 'meme', 'inu', 'bonk', 'wif',
  'pengu', 'mog', 'pnut', 'brett', 'spx', 'ponke', 'cheems', 'fart',
  'trump', 'mumu', 'turbo', 'popcat', 'mew', 'goat', 'chillguy', 'wojak',
  'moodeng', 'moo deng', 'neiro', 'bome', 'wojak',
];

const AI_WORDS = [
  'ai', 'agent', 'fetch', 'render', 'tao', 'bittensor', 'gpu', 'compute',
  'sky', 'aixbt', 'virtual', 'griffain', 'zerebro', 'arc', 'singularity',
  'numeraire', 'ocean', 'autonol', 'aleph', 'akash', 'cortex',
];

function haystack(coin) {
  return (coin.id + ' ' + coin.symbol + ' ' + coin.name).toLowerCase();
}

function matchAnyWord(text, words) {
  for (const w of words) {
    // Match as whole word for short tokens, substring for longer.
    if (w.length <= 3) {
      const re = new RegExp(`(^|[\\s\\-_])${w}([\\s\\-_]|$)`, 'i');
      if (re.test(text)) return true;
    } else if (text.includes(w)) {
      return true;
    }
  }
  return false;
}

export function applyFilter(coins, filterId) {
  if (!filterId || filterId === 'all') return coins;

  switch (filterId) {
    case 'solana':
      return coins.filter((c) => SOLANA_IDS.has(c.id));
    case 'bnb':
      return coins.filter((c) => BNB_IDS.has(c.id));
    case 'ethereum':
      return coins.filter((c) => ETHEREUM_IDS.has(c.id));
    case 'base':
      return coins.filter((c) => BASE_IDS.has(c.id));
    case 'memes':
      return coins.filter((c) => matchAnyWord(haystack(c), MEME_WORDS));
    case 'ai':
      return coins.filter((c) => matchAnyWord(haystack(c), AI_WORDS));
    default:
      return coins;
  }
}
