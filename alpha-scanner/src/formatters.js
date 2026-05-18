/**
 * Smart number / price / percent formatters.
 * All take `null`/`undefined` defensively.
 */

export function fmtPrice(p) {
  if (p == null || isNaN(p)) return '--';
  if (p >= 1000)   return '$' + p.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (p >= 1)      return '$' + p.toFixed(3);
  if (p >= 0.01)   return '$' + p.toFixed(4);
  if (p >= 0.0001) return '$' + p.toFixed(6);
  if (p === 0)     return '$0';
  return '$' + p.toExponential(2);
}

export function fmtBig(n) {
  if (n == null || isNaN(n)) return '--';
  const abs = Math.abs(n);
  if (abs >= 1e12) return '$' + (n / 1e12).toFixed(2) + 'T';
  if (abs >= 1e9)  return '$' + (n / 1e9).toFixed(2) + 'B';
  if (abs >= 1e6)  return '$' + (n / 1e6).toFixed(2) + 'M';
  if (abs >= 1e3)  return '$' + (n / 1e3).toFixed(1) + 'K';
  return '$' + n.toFixed(0);
}

export function fmtPct(p) {
  if (p == null || isNaN(p)) return '--';
  return (p >= 0 ? '+' : '') + p.toFixed(2) + '%';
}

export function fmtTime(d) {
  if (!d) return '--:--:--';
  const date = d instanceof Date ? d : new Date(d);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function fmtRank(n) {
  if (n == null) return '--';
  return String(n).padStart(2, '0');
}

export function fmtSupply(n) {
  if (n == null || isNaN(n)) return '--';
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toFixed(0);
}
