import type { Snapshot } from '../types';
import { relativeTime } from '../lib/format';

export function StatsBand({ data }: { data: Snapshot }) {
  const providers = new Set(data.providers.map((provider) => provider.id)).size;
  const records =
    data.gpuBaremetal.length +
    data.gpuHourly.length +
    data.textModels.length +
    data.mediaModels.length +
    data.plans.length;

  const stats = [
    { value: String(providers), label: '供应商', note: 'Providers' },
    { value: records.toLocaleString('en-US'), label: '报价数据点', note: 'Offers' },
    { value: '05', label: '价格维度', note: 'Dimensions' },
    { value: '每日', label: '抓取频率', note: 'Refresh' },
  ];

  return (
    <section className="stats-band" aria-label="数据覆盖概览">
      <div className="container stats-inner">
        {stats.map((stat) => (
          <div className="stat" key={stat.label}>
            <b>{stat.value}</b>
            <span className="stat-label">{stat.label}</span>
            <span className="stat-note">{stat.note}</span>
          </div>
        ))}
        <p className="stats-stamp">
          快照时间
          <br />
          <b>{relativeTime(data.meta.snapshotAt)}</b>
        </p>
      </div>
    </section>
  );
}
