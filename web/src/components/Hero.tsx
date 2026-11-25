import { useMemo } from 'react';
import type { Snapshot } from '../types';
import { formatNumber, formatPercent, relativeTime, toUsd } from '../lib/format';

export function Hero({ data }: { data: Snapshot }) {
  const providers = useMemo(
    () => new Map(data.providers.map((provider) => [provider.id, provider])),
    [data.providers],
  );

  const terminalRows = useMemo(
    () =>
      [...data.gpuHourly]
        .sort((a, b) => toUsd(a.price, a.currency, data.meta.rates) - toUsd(b.price, b.currency, data.meta.rates))
        .slice(0, 6),
    [data.gpuHourly, data.meta.rates],
  );

  const changes = useMemo(
    () =>
      data.gpuHourly
        .filter((row) => row.prevPrice !== undefined)
        .slice(0, 5)
        .map((row) => ({
          id: row.id,
          provider: providers.get(row.providerId)?.short ?? row.providerId,
          gpu: row.gpu,
          price: row.price,
          prev: row.prevPrice as number,
          currency: row.currency,
        })),
    [data.gpuHourly, providers],
  );

  const uniqueProviders = useMemo(
    () => new Set(data.providers.map((provider) => provider.id)).size,
    [data.providers],
  );
  const recordCount =
    data.gpuBaremetal.length +
    data.gpuHourly.length +
    data.textModels.length +
    data.mediaModels.length +
    data.plans.length;

  return (
    <section className="hero" id="top">
      <div className="hero-grid" aria-hidden="true" />
      <div className="container hero-inner">
        <div className="hero-copy">
          <p className="eyebrow">
            <span className="pulse" aria-hidden="true" />
            AI INFRA PRICE INTELLIGENCE
          </p>
          <h1>
            <em>算力集市</em>
          </h1>
          <p className="lede">
            展示全网 GPU 裸金属、卡时租赁、文本推理、图像与视频生成的价格。
          </p>
          <div className="hero-actions">
            <a className="btn btn-primary" href="#prices">
              浏览报价单
            </a>
            <a className="btn btn-ghost" href="#method">
              了解数据来源
            </a>
          </div>
          <p className="hero-meta">
            <span>{uniqueProviders} 家服务平台</span>
            <span>{recordCount} 条报价</span>
            <span>5 个价格维度</span>
            <span>更新于 {relativeTime(data.meta.snapshotAt)}</span>
          </p>
        </div>

        <div className="terminal" role="img" aria-label="GPU 卡时价格示例终端">
          <div className="terminal-bar">
            <span className="dot dot-r" />
            <span className="dot dot-y" />
            <span className="dot dot-g" />
            <span className="terminal-title">agent-everything / price feed</span>
            <span className="terminal-live">
              <i aria-hidden="true" />
              live
            </span>
          </div>
          <div className="terminal-body">
            <p className="terminal-cmd">
              <span>$</span> ae query --category gpu-hourly
            </p>
            <div className="terminal-head">
              <span>provider</span>
              <span>gpu</span>
              <span>$/hr</span>
              <span>Δ</span>
            </div>
            {terminalRows.map((row) => {
              const price = toUsd(row.price, row.currency, data.meta.rates);
              const prev = row.prevPrice
                ? toUsd(row.prevPrice, row.currency, data.meta.rates)
                : undefined;
              const delta = prev ? (price - prev) / prev : undefined;
              return (
                <div className="terminal-row" key={row.id}>
                  <span className="t-provider">
                    {providers.get(row.providerId)?.short ?? row.providerId}
                  </span>
                  <span className="t-gpu">{row.gpu}</span>
                  <span className="t-price">${formatNumber(price)}</span>
                  <span
                    className={`t-delta${delta === undefined ? ' is-flat' : delta > 0 ? ' is-up' : ' is-down'}`}
                  >
                    {delta === undefined
                      ? '—'
                      : `${delta > 0 ? '↑' : '↓'} ${Math.abs(delta * 100).toFixed(1)}%`}
                  </span>
                </div>
              );
            })}
            <div className="terminal-foot">
              <span>
                ‹ {data.gpuHourly.length} offers · {uniqueProviders} providers ›
              </span>
              <span className="cursor" aria-hidden="true" />
            </div>
          </div>
        </div>
      </div>

      {changes.length > 0 ? (
        <div className="container">
          <div className="hero-ticker" aria-label="最近价格变动">
            <span className="ticker-label">
              <i aria-hidden="true" />
              RECENT
            </span>
            <ul>
              {changes.map((change) => {
                const ratio = (change.price - change.prev) / change.prev;
                return (
                  <li key={change.id}>
                    <span className="ticker-prov">{change.provider}</span>
                    <b>{change.gpu}</b>
                    <s>
                      ${formatNumber(toUsd(change.prev, change.currency, data.meta.rates))}
                    </s>
                    <em>
                      ${formatNumber(toUsd(change.price, change.currency, data.meta.rates))}
                    </em>
                    <span className={ratio > 0 ? 'up' : 'down'}>
                      {formatPercent(ratio).replace('-', '')}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ) : null}
    </section>
  );
}
