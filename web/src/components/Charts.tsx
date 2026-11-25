import { useMemo } from 'react';
import type { Snapshot } from '../types';
import { formatNumber, toUsd, unitSuffix } from '../lib/format';
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
}: {
  rows: Array<{ gpu: string; min: number; max: number; count: number }>;
}) {
  const domain = Math.max(...rows.map((row) => row.max), 1) * 1.05;

  return (
    <div className="range-chart">
      <div className="range-head">
        <span>GPU 型号</span>
        <span>USD / 卡时</span>
      </div>
      {rows.map((row) => (
        <div className="range-row" key={row.gpu}>
          <span className="range-label">
            {row.gpu}
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
            ${formatNumber(row.min)}–${formatNumber(row.max)}
          </span>
        </div>
      ))}
      <div className="range-axis" aria-hidden="true">
        <span>$0</span>
        <span>${formatNumber(domain)}</span>
      </div>
    </div>
  );
}

export function Charts({ data }: { data: Snapshot }) {
  const rates = data.meta.rates;
  const providers = useMemo(
    () => new Map(data.providers.map((provider) => [provider.id, provider])),
    [data.providers],
  );

  const ranges = useMemo(() => {
    const groups = new Map<string, { min: number; max: number; count: number }>();
    for (const row of data.gpuHourly) {
      const price = toUsd(row.price, row.currency, rates);
      const group = groups.get(row.gpu);
      if (!group) {
        groups.set(row.gpu, { min: price, max: price, count: 1 });
      } else {
        group.min = Math.min(group.min, price);
        group.max = Math.max(group.max, price);
        group.count += 1;
      }
    }
    return [...groups.entries()]
      .map(([gpu, group]) => ({ gpu, ...group }))
      .sort((a, b) => a.min - b.min);
  }, [data.gpuHourly, rates]);

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
            display: `$${formatNumber(value)}`,
            suffix: '/1M',
          };
        })
        .sort((a, b) => a.value - b.value)
        .slice(0, 10),
    [data.textModels, providers, rates],
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
            display: `$${formatNumber(value)}`,
            suffix: unitSuffix(model.unit),
          };
        })
        .sort((a, b) => a.value - b.value)
        .slice(0, 6);
    return { image: build('image'), video: build('video') };
  }, [data.mediaModels, providers, rates]);

  return (
    <section className="section" id="charts">
      <div className="container">
        <SectionHead
          index="03"
          kicker="COMPARISON"
          title={
            <>
              同一型号，
              <br />
              价格差多少？
            </>
          }
          desc="按统一口径换算后，同一张卡、同一类模型在不同供应商之间的价格区间与成本排序。"
        />

        <div className="charts-grid">
          <article className="chart-card chart-wide">
            <header className="chart-head">
              <h3>GPU 卡时价格带</h3>
              <span>USD / 卡时 · 各供应商最低与最高</span>
            </header>
            <RangeChart rows={ranges} />
          </article>

          <article className="chart-card">
            <header className="chart-head">
              <h3>文本模型输出成本</h3>
              <span>USD / 1M tokens · 取最低的 10 个</span>
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
