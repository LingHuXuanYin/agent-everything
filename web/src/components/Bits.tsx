import type { ReactNode } from 'react';

export function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 64 64" width="18" height="18" fill="none">
        <g stroke="currentColor" strokeWidth="4.5" strokeLinecap="round">
          <path d="M32 10v44" />
          <path d="M13 21l38 22" />
          <path d="M13 43l38-22" />
        </g>
        <circle
          cx="32"
          cy="32"
          r="6.5"
          fill="var(--bg)"
          stroke="currentColor"
          strokeWidth="4"
        />
      </svg>
    </span>
  );
}

export function ProviderTag({ short, region }: { short: string; region: string }) {
  return (
    <span className="prov">
      <span className="prov-name">{short}</span>
      <span className={`reg reg-${region.toLowerCase()}`}>{region}</span>
    </span>
  );
}

const STATUS: Record<string, { label: string; tone: string }> = {
  available: { label: '可租', tone: 'ok' },
  limited: { label: '紧张', tone: 'warn' },
  waitlist: { label: '候补', tone: 'off' },
};

export function AvailabilityTag({ value }: { value: string }) {
  const status = STATUS[value] ?? { label: value, tone: 'off' };
  return (
    <span className={`status status-${status.tone}`}>
      <i aria-hidden="true" />
      {status.label}
    </span>
  );
}

export function SourceLink({
  href,
  label,
  text,
}: {
  href: string;
  label?: string;
  text?: string;
}) {
  return (
    <a
      className={`src-link${text ? ' src-link-cta' : ''}`}
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      aria-label={label ?? '查看官方价格来源'}
      title="查看官方价格来源"
    >
      {text ?? '↗'}
    </a>
  );
}

export function Delta({ current, prev }: { current: number; prev?: number }) {
  if (prev === undefined || prev === 0) {
    return <span className="delta delta-flat">—</span>;
  }
  const ratio = (current - prev) / prev;
  if (Math.abs(ratio) < 0.0001) {
    return <span className="delta delta-flat">持平</span>;
  }
  const up = ratio > 0;
  return (
    <span
      className={`delta ${up ? 'delta-up' : 'delta-down'}`}
      title={up ? '较上次快照上涨' : '较上次快照下降'}
    >
      {up ? '↑' : '↓'} {Math.abs(ratio * 100).toFixed(1)}%
    </span>
  );
}

export function SectionHead({
  index,
  kicker,
  title,
  desc,
}: {
  index: string;
  kicker: string;
  title: ReactNode;
  desc?: ReactNode;
}) {
  return (
    <header className="section-head">
      <div className="section-kicker">
        <span>{index}</span>
        {kicker}
      </div>
      <h2>{title}</h2>
      {desc ? <p>{desc}</p> : null}
    </header>
  );
}
