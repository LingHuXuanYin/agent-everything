import { useMemo, useState } from 'react';
import type { Currency, Snapshot } from '../types';
import { formatMoney, toUsd, unitSuffix } from '../lib/format';
import { SectionHead } from './Bits';

interface BarItem {
  key: string;
  label: string;
  sub?: string;
  value: number;
  display: string;
  suffix: string;
}

function BarList({ items }: { items: BarItem[] }) {
  const max = Math.max(...items.map((item) => item.value), 0.0001);
  return (
    <ul className="bar-list">
      {items.map((item) => (
        <li className="bar-row" key={item.key}>
          <span className="bar-label">
            <b>{item.label}</b>
            {item.sub ? <small>{item.sub}</small> : null}
          </span>
          <span className="bar-track">
            <span
              className="bar-fill"
              style={{ width: `${Math.max((item.value / max) * 100, 2)}%` }}
            />
          </span>
          <span className="bar-value">
            {item.display}
            <small>{item.suffix}</small>
          </span>
        </li>
      ))}
    </ul>
  );
}

function RangeChart({
  rows,
  currency,
  rates,
}: {
  rows: Array<{ key: string; gpu: string; vram: number; min: number; max: number; count: number }>;
  currency: Currency;
  rates: { CNY: number };
}) {
  const domain = Math.max(...rows.map((row) => row.max), 1) * 1.05;

  if (!rows.length) {
    return <p className="chart-empty">当前筛选条件下没有卡时报价。</p>;
  }

  return (
    <div className="range-chart">
      <div className="range-head">
        <span>GPU 型号</span>
        <span>{currency} / 卡时</span>
      </div>
      {rows.map((row) => (
        <div className="range-row" key={row.key}>
          <span className="range-label">
            {row.gpu} {row.vram}G
            <small>{row.count} 个报价</small>
          </span>
          <span className="range-track" aria-hidden="true">
            <span
              className="range-fill"
              style={{
                left: `${(row.min / domain) * 100}%`,
                width: `${Math.max(((row.max - row.min) / domain) * 100, 2)}%`,
              }}
            />
            <span className="range-dot is-min" style={{ left: `${(row.min / domain) * 100}%` }} />
            <span className="range-dot is-max" style={{ left: `${(row.max / domain) * 100}%` }} />
          </span>
          <span className="range-value">
            {formatMoney(row.min, 'USD', currency, rates)}–
            {formatMoney(row.max, 'USD', currency, rates)}
          </span>
        </div>
      ))}
      <div className="range-axis" aria-hidden="true">
        <span>{formatMoney(0, 'USD', currency, rates)}</span>
        <span>{formatMoney(domain, 'USD', currency, rates)}</span>
      </div>
    </div>
  );
}

export function Charts({ data }: { data: Snapshot }) {
  const rates = data.meta.rates;
  const [currency, setCurrency] = useState<Currency>('CNY');
  const [gpuFilter, setGpuFilter] = useState('all');
  const [providerFilter, setProviderFilter] = useState('all');
  const money = (usdValue: number) => formatMoney(usdValue, 'USD', currency, rates);
  const providers = useMemo(
    () => new Map(data.providers.map((provider) => [provider.id, provider])),
    [data.providers],
  );

  const gpuOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of data.gpuHourly) {
      map.set(`${row.gpu}|${row.vramGb}`, `${row.gpu} ${row.vramGb}G`);
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], 'en'));
  }, [data.gpuHourly]);

  const providerOptions = useMemo(() => {
    const ids = [...new Set(data.gpuHourly.map((row) => row.providerId))];
    return ids
      .map((id) => ({ id, name: providers.get(id)?.short ?? id }))
      .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'));
  }, [data.gpuHourly, providers]);

  const baremetalOnly = useMemo(() => {
    const key = (gpu: string) =>
      gpu
        .toLowerCase()
        .replace(/nvidia|huawei|amd|华为|昇腾|ascend/g, '')
        .replace(/sxm|pcie|nvlink|nvl|sff/g, '')
        .replace(/\b\d+\s*g\b/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
    const hourly = new Set(data.gpuHourly.map((row) => key(row.gpu)));
    const names = new Map<string, string>();
    for (const row of data.gpuBaremetal) {
      if (hourly.has(key(row.gpu))) continue;
      names.set(key(row.gpu), `${row.gpu.replace(/^NVIDIA\s+|^华为\s+/i, '')} ${row.vramGb}G`);
    }
    return [...names.values()];
  }, [data.gpuBaremetal, data.gpuHourly]);

  const { aggregates, hourlyCount } = useMemo(() => {
    const groups = new Map<
      string,
      { key: string; gpu: string; vram: number; min: number; max: number; count: number }
    >();
    let count = 0;
    for (const row of data.gpuHourly) {
      if (providerFilter !== 'all' && row.providerId !== providerFilter) continue;
      const key = `${row.gpu}|${row.vramGb}`;
      if (gpuFilter !== 'all' && key !== gpuFilter) continue;
      const price = toUsd(row.price, row.currency, rates);
      const group = groups.get(key);
      count += 1;
      if (!group) {
        groups.set(key, {
          key,
          gpu: row.gpu,
          vram: row.vramGb,
          min: price,
          max: price,
          count: 1,
        });
      } else {
        group.min = Math.min(group.min, price);
        group.max = Math.max(group.max, price);
        group.count += 1;
      }
    }
    const list = [...groups.values()].sort((a, b) => a.min - b.min);
    return { aggregates: list, hourlyCount: count };
  }, [data.gpuHourly, rates, providerFilter, gpuFilter]);

  const textItems = useMemo<BarItem[]>(
    () =>
      [...data.textModels]
        .map((model) => {
          const value = toUsd(model.outputPerM, model.currency, rates);
          return {
            key: model.id,
            label: model.model,
            sub: providers.get(model.providerId)?.short ?? model.providerId,
            value,
            display: money(value),
            suffix: '/1M',
          };
        })
        .sort((a, b) => a.value - b.value)
        .slice(0, 10),
    [data.textModels, providers, rates, currency], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const mediaItems = useMemo(() => {
    const build = (kind: 'image' | 'video') =>
      data.mediaModels
        .filter((model) => model.kind === kind)
        .map((model) => {
          const value = toUsd(model.price, model.currency, rates);
          return {
            key: model.id,
            label: model.model,
            sub: providers.get(model.providerId)?.short ?? model.providerId,
            value,
            display: money(value),
            suffix: unitSuffix(model.unit),
          };
        })
        .sort((a, b) => a.value - b.value)
        .slice(0, 6);
    return { image: build('image'), video: build('video') };
  }, [data.mediaModels, providers, rates, currency]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section className="section" id="charts">
      <div className="container">
        <SectionHead
          index="03"
          kicker="COMPARISON"
          title="价格区间"
          desc="按统一口径换算后，同一张卡、同一类模型在不同服务平台之间的价格区间与成本排序。"
        />

        <div className="charts-toolbar">
          <div className="currency-toggle" role="group" aria-label="图表显示币种">
            {(['CNY', 'USD'] as Currency[]).map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={currency === item}
                className={currency === item ? 'is-active' : ''}
                onClick={() => setCurrency(item)}
              >
                {item === 'USD' ? '$ USD' : '¥ CNY'}
              </button>
            ))}
          </div>
        </div>

        <div className="charts-grid">
          <article className="chart-card chart-wide">
            <header className="chart-head">
              <h3>GPU 卡时价格带</h3>
              <div className="chart-filters">
                <label className="select-field">
                  <span className="sr-only">筛选 GPU 型号</span>
                  <select value={gpuFilter} onChange={(event) => setGpuFilter(event.target.value)}>
                    <option value="all">全部型号</option>
                    {gpuOptions.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="select-field">
                  <span className="sr-only">筛选服务平台</span>
                  <select
                    value={providerFilter}
                    onChange={(event) => setProviderFilter(event.target.value)}
                  >
                    <option value="all">全部服务平台</option>
                    {providerOptions.map((provider) => (
                      <option key={provider.id} value={provider.id}>
                        {provider.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </header>
            <RangeChart rows={aggregates} currency={currency} rates={rates} />
            <p className="chart-note">
              共 {aggregates.length} 个型号、{hourlyCount} 条卡时报价
              {gpuFilter === 'all' && providerFilter === 'all' && baremetalOnly.length
                ? `；另有 ${baremetalOnly.length} 个型号只有整机月租、暂无卡时报价（如 ${baremetalOnly
                    .slice(0, 3)
                    .join('、')}），详见「报价单 · GPU 裸金属」`
                : ''}
              。
            </p>
          </article>

          <article className="chart-card">
            <header className="chart-head">
              <h3>文本模型输出成本</h3>
              <span>{currency} / 1M tokens · 取最低的 10 个</span>
            </header>
            <BarList items={textItems} />
          </article>

          <article className="chart-card">
            <header className="chart-head">
              <h3>图像 / 视频生成成本</h3>
              <span>按张 · 按秒 · 取最低的 6 个</span>
            </header>
            <h4 className="chart-sub">图像 · 每张</h4>
            <BarList items={mediaItems.image} />
            <h4 className="chart-sub">视频 · 每秒</h4>
            <BarList items={mediaItems.video} />
          </article>
        </div>
      </div>
    </section>
  );
}
