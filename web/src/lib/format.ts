import type { Currency } from '../types';

/** 统一折算：任意币种 → USD → 目标币种 */
export function convert(
  amount: number,
  from: Currency,
  to: Currency,
  rates: { CNY: number },
): number {
  const usd = from === 'USD' ? amount : amount / rates.CNY;
  return to === 'USD' ? usd : usd * rates.CNY;
}

export function toUsd(amount: number, from: Currency, rates: { CNY: number }): number {
  return from === 'USD' ? amount : amount / rates.CNY;
}

function trim(value: string): string {
  return value.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
}

export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  if (abs === 0) return '0';
  if (abs >= 1000) return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (abs >= 100) return trim(value.toFixed(1));
  if (abs >= 10) return trim(value.toFixed(2));
  if (abs >= 1) return trim(value.toFixed(2));
  return trim(value.toFixed(3));
}

export function formatMoney(
  amount: number,
  from: Currency,
  to: Currency,
  rates: { CNY: number },
): string {
  const value = convert(amount, from, to, rates);
  return `${to === 'USD' ? '$' : '¥'}${formatNumber(value)}`;
}

export function formatPercent(delta: number): string {
  const sign = delta > 0 ? '+' : '';
  return `${sign}${(delta * 100).toFixed(1)}%`;
}

export function relativeTime(iso: string): string {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return iso;
  const diff = Date.now() - time;
  if (diff <= 60_000) return '刚刚';
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} 天前`;
  return formatDate(iso);
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Shanghai',
  }).format(date);
}

export function unitSuffix(unit: 'image' | 'second'): string {
  return unit === 'image' ? '/张' : '/秒';
}
