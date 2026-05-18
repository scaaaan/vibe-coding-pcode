/**
 * Momentum Score (0-100)
 *
 * Inputs are CoinGecko `/coins/markets` rows requested with
 * `price_change_percentage=1h,24h,7d`.
 *
 * Weighting:
 *   - 24h trend       up to ±25
 *   - 1h acceleration up to ±15
 *   - volume/mcap     0..20  (liquidity / interest)
 *   - 7d confirmation up to ±10
 *   - small-cap bonus +3 / +5
 *
 * Clamped to [0, 100].
 */
export function calcMomentum(coin) {
  if (!coin) return 50;

  let score = 50;
  const ch24 = coin.price_change_percentage_24h || 0;
  const ch1h = coin.price_change_percentage_1h_in_currency || 0;
  const ch7d = coin.price_change_percentage_7d_in_currency || 0;
  const volRatio = (coin.total_volume || 0) / (coin.market_cap || 1);

  score += Math.max(-25, Math.min(25, ch24 * 0.5));   // 24h trend
  score += Math.max(-15, Math.min(15, ch1h * 1.5));   // 1h acceleration

  if (volRatio > 1)        score += 20;
  else if (volRatio > 0.5) score += 15;
  else if (volRatio > 0.2) score += 10;
  else if (volRatio > 0.1) score += 5;

  score += Math.max(-10, Math.min(10, ch7d * 0.2));   // 7d confirmation

  if (coin.market_cap < 50e6)        score += 5;
  else if (coin.market_cap < 200e6)  score += 3;

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Human-readable signal interpretation.
 * Returns { label, text }.
 */
export function signal(score) {
  if (score >= 75) {
    return {
      label: 'STRONG MOMENTUM',
      text: 'High confluence across 1h / 24h / volume. Watch for continuation; trail stops if entering.',
    };
  }
  if (score >= 60) {
    return {
      label: 'BUILDING MOMENTUM',
      text: 'Positive setup forming. Await confirmation — break of recent high on rising volume.',
    };
  }
  if (score >= 40) {
    return {
      label: 'NEUTRAL',
      text: 'No clear edge here. Mixed signals across timeframes — wait for cleaner setup.',
    };
  }
  return {
    label: 'WEAK / FADING',
    text: 'Bearish indicators dominant. Distribution, declining volume, or breakdown in progress.',
  };
}
