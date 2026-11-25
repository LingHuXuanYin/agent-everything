import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Category, Currency, Snapshot } from '../types';
import { formatMoney, toUsd, unitSuffix } from '../lib/format';
import {
  AvailabilityTag,
  Delta,
  ProviderTag,
  SectionHead,
  SourceLink,
} from './Bits';

type SortDir = 'asc' | 'desc';

interface SortState {
  key: string;
  dir: SortDir;
}

interface Column {
  key: string;
  label: string;
  align?: 'right';
  sortable?: boolean;
}

interface Row {
  id: string;
  providerId: string;
  search: string;
  sort: Record<string, number | string>;
  cells: Record<string, ReactNode>;
}

interface Built {
  columns: Column[];
  rows: Row[];
  providers: Array<{ id: string; name: string }>;
  defaultSort: SortState;
}

const TABS: Array<{ id: Category; label: string }> = [
  { id: 'gpu-baremetal', label: 'GPU 裸金属' },
  { id: 'gpu-hourly', label: 'GPU 卡时' },
  { id: 'text-api', label: '文本推理 API' },
  { id: 'media-api', label: '图像 · 视频 API' },
  { id: 'plans', label: '月费套餐' },
];

function buildCategory(category: Category, data: Snapshot, currency: Currency): Built {
  const rates = data.meta.rates;
  const index = new Map(data.providers.map((provider) => [provider.id, provider]));
  const money = (amount: number, from: Currency) => formatMoney(amount, from, currency, rates);
  const usd = (amount: number, from: Currency) => toUsd(amount, from, rates);

  const providerNode = (providerId: string) => {
    const provider = index.get(providerId);
    return <ProviderTag short={provider?.short ?? providerId} region={provider?.region ?? 'US'} />;
  };

  let columns: Column[] = [];
  let rows: Row[] = [];
  let defaultSort: SortState = { key: 'price', dir: 'asc' };

  switch (category) {
    case 'gpu-baremetal': {
      columns = [
        { key: 'product', label: '整机机型', sortable: true },
        { key: 'provider', label: '供应商', sortable: true },
        { key: 'gpu', label: 'GPU / 显存', sortable: true },
        { key: 'price', label: '整机月租', align: 'right', sortable: true },
        { key: 'perGpu', label: '单卡月租', align: 'right', sortable: true },
        { key: 'region', label: '区域', sortable: true },
        { key: 'status', label: '状态', sortable: true },
        { key: 'source', label: '来源' },
      ];
      rows = data.gpuBaremetal.map((row) => {
        const provider = index.get(row.providerId);
        const name = provider?.name ?? row.providerId;
        return {
          id: row.id,
          providerId: row.providerId,
          search: [name, provider?.short, row.product, row.gpu, row.region]
            .filter(Boolean)
            .join(' ')
            .toLowerCase(),
          sort: {
            provider: provider?.short ?? row.providerId,
            product: row.product,
            gpu: row.gpu,
            price: usd(row.price, row.currency),
            perGpu: usd(row.price / row.gpuCount, row.currency),
            region: row.region,
            status: row.availability,
          },
          cells: {
            provider: providerNode(row.providerId),
            product: <span className="cell-strong">{row.product}</span>,
            gpu: (
              <span className="cell-sub">
                {row.gpu} × {row.gpuCount} · {row.vramGb} GB
              </span>
            ),
            price: (
              <span className="num-main">
                {money(row.price, row.currency)}
                <small>/月</small>
                <em>{row.minTerm}</em>
              </span>
            ),
            perGpu: (
              <span className="num-main">
                {money(row.price / row.gpuCount, row.currency)}
                <small>/卡·月</small>
              </span>
            ),
            region: <span className="mono muted">{row.region}</span>,
            status: <AvailabilityTag value={row.availability} />,
            source: <SourceLink href={row.sourceUrl} />,
          },
        };
      });
      defaultSort = { key: 'perGpu', dir: 'asc' };
      break;
    }

    case 'gpu-hourly': {
      columns = [
        { key: 'provider', label: '供应商', sortable: true },
        { key: 'gpu', label: 'GPU', sortable: true },
        { key: 'vram', label: '显存', align: 'right', sortable: true },
        { key: 'price', label: '单价', align: 'right', sortable: true },
        { key: 'term', label: '计费方式', sortable: true },
        { key: 'region', label: '区域', sortable: true },
        { key: 'status', label: '状态', sortable: true },
        { key: 'source', label: '来源' },
      ];
      rows = data.gpuHourly.map((row) => {
        const provider = index.get(row.providerId);
        const name = provider?.name ?? row.providerId;
        return {
          id: row.id,
          providerId: row.providerId,
          search: [name, provider?.short, row.gpu, row.region, row.minTerm]
            .filter(Boolean)
            .join(' ')
            .toLowerCase(),
          sort: {
            provider: provider?.short ?? row.providerId,
            gpu: row.gpu,
            vram: row.vramGb,
            price: usd(row.price, row.currency),
            term: row.minTerm,
            region: row.region,
            status: row.availability,
          },
          cells: {
            provider: providerNode(row.providerId),
            gpu: <span className="cell-strong">{row.gpu}</span>,
            vram: <span className="mono">{row.vramGb} GB</span>,
            price: (
              <span className="num-main">
                {money(row.price, row.currency)}
                <small>/卡时</small>
                <Delta current={row.price} prev={row.prevPrice} />
              </span>
            ),
            term: <span className="cell-sub">{row.minTerm}</span>,
            region: <span className="mono muted">{row.region}</span>,
            status: <AvailabilityTag value={row.availability} />,
            source: <SourceLink href={row.sourceUrl} />,
          },
        };
      });
      defaultSort = { key: 'price', dir: 'asc' };
      break;
    }

    case 'text-api': {
      columns = [
        { key: 'model', label: '模型', sortable: true },
        { key: 'provider', label: '供应商', sortable: true },
        { key: 'context', label: '上下文', align: 'right', sortable: true },
        { key: 'input', label: '输入 / 1M', align: 'right', sortable: true },
        { key: 'output', label: '输出 / 1M', align: 'right', sortable: true },
        { key: 'cached', label: '缓存命中', align: 'right', sortable: true },
        { key: 'source', label: '来源' },
      ];
      rows = data.textModels.map((row) => {
        const provider = index.get(row.providerId);
        const name = provider?.name ?? row.providerId;
        return {
          id: row.id,
          providerId: row.providerId,
          search: [name, provider?.short, row.model].filter(Boolean).join(' ').toLowerCase(),
          sort: {
            model: row.model,
            provider: provider?.short ?? row.providerId,
            context: row.contextK,
            input: usd(row.inputPerM, row.currency),
            output: usd(row.outputPerM, row.currency),
            cached: row.cachedInputPerM ?? -1,
          },
          cells: {
            model: <span className="cell-strong">{row.model}</span>,
            provider: providerNode(row.providerId),
            context: <span className="mono">{row.contextK ? `${row.contextK}K` : '—'}</span>,
            input: (
              <span className="num-main">
                {money(row.inputPerM, row.currency)}
                <small>/1M</small>
              </span>
            ),
            output: (
              <span className="num-main">
                {money(row.outputPerM, row.currency)}
                <small>/1M</small>
              </span>
            ),
            cached:
              row.cachedInputPerM === undefined ? (
                <span className="muted">—</span>
              ) : (
                <span className="num-main muted">
                  {money(row.cachedInputPerM, row.currency)}
                  <small>/1M</small>
                </span>
              ),
            source: <SourceLink href={row.sourceUrl} />,
          },
        };
      });
      defaultSort = { key: 'output', dir: 'asc' };
      break;
    }

    case 'media-api': {
      columns = [
        { key: 'model', label: '模型', sortable: true },
        { key: 'provider', label: '供应商', sortable: true },
        { key: 'kind', label: '类型', sortable: true },
        { key: 'unit', label: '计量', sortable: true },
        { key: 'price', label: '单价', align: 'right', sortable: true },
        { key: 'resolution', label: '分辨率 / 时长', sortable: true },
        { key: 'source', label: '来源' },
      ];
      rows = data.mediaModels.map((row) => {
        const provider = index.get(row.providerId);
        const name = provider?.name ?? row.providerId;
        return {
          id: row.id,
          providerId: row.providerId,
          search: [name, provider?.short, row.model, row.resolution]
            .filter(Boolean)
            .join(' ')
            .toLowerCase(),
          sort: {
            model: row.model,
            provider: provider?.short ?? row.providerId,
            kind: row.kind,
            unit: row.unit,
            price: usd(row.price, row.currency),
            resolution: row.resolution,
          },
          cells: {
            model: <span className="cell-strong">{row.model}</span>,
            provider: providerNode(row.providerId),
            kind: (
              <span className={`kind kind-${row.kind}`}>
                {row.kind === 'image' ? '图像' : '视频'}
              </span>
            ),
            unit: <span className="cell-sub">{row.unit === 'image' ? '按张' : '按秒'}</span>,
            price: (
              <span className="num-main">
                {money(row.price, row.currency)}
                <small>{unitSuffix(row.unit)}</small>
              </span>
            ),
            resolution: <span className="mono muted">{row.resolution}</span>,
            source: <SourceLink href={row.sourceUrl} />,
          },
        };
      });
      defaultSort = { key: 'price', dir: 'asc' };
      break;
    }

    case 'plans': {
      columns = [
        { key: 'name', label: '套餐', sortable: true },
        { key: 'provider', label: '供应商', sortable: true },
        { key: 'monthly', label: '月费', align: 'right', sortable: true },
        { key: 'highlights', label: '主要权益' },
        { key: 'source', label: '来源' },
      ];
      rows = data.plans.map((row) => {
        const provider = index.get(row.providerId);
        const name = provider?.name ?? row.providerId;
        return {
          id: row.id,
          providerId: row.providerId,
          search: [name, provider?.short, row.name, ...row.highlights]
            .filter(Boolean)
            .join(' ')
            .toLowerCase(),
          sort: {
            name: row.name,
            provider: provider?.short ?? row.providerId,
            monthly: usd(row.monthly, row.currency),
          },
          cells: {
            name: <span className="cell-strong">{row.name}</span>,
            provider: providerNode(row.providerId),
            monthly: (
              <span className="num-main">
                {money(row.monthly, row.currency)}
                <small>/月</small>
              </span>
            ),
            highlights: <span className="cell-sub">{row.highlights.join(' · ')}</span>,
            source: <SourceLink href={row.sourceUrl} />,
          },
        };
      });
      defaultSort = { key: 'monthly', dir: 'asc' };
      break;
    }
  }

  const providerIds = [...new Set(rows.map((row) => row.providerId))];
  const providers = providerIds
    .map((id) => ({ id, name: index.get(id)?.short ?? id }))
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'));

  return { columns, rows, providers, defaultSort };
}

export function Explorer({
  data,
  active,
  onChange,
}: {
  data: Snapshot;
  active: Category;
  onChange: (category: Category) => void;
}) {
  const [query, setQuery] = useState('');
  const [providerFilter, setProviderFilter] = useState('all');
  const [currency, setCurrency] = useState<Currency>('USD');
  const [sort, setSort] = useState<SortState>({ key: 'perGpu', dir: 'asc' });

  const built = useMemo(() => buildCategory(active, data, currency), [active, data, currency]);

  useEffect(() => {
    setSort(built.defaultSort);
    setProviderFilter('all');
    setQuery('');
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = built.rows.filter((row) => {
      if (providerFilter !== 'all' && row.providerId !== providerFilter) return false;
      if (needle && !row.search.includes(needle)) return false;
      return true;
    });

    return [...filtered].sort((a, b) => {
      const left = a.sort[sort.key];
      const right = b.sort[sort.key];
      if (typeof left === 'number' && typeof right === 'number') {
        return sort.dir === 'asc' ? left - right : right - left;
      }
      const cmp = String(left ?? '').localeCompare(String(right ?? ''), 'zh-Hans-CN');
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [built.rows, query, providerFilter, sort]);

  const counts: Record<Category, number> = {
    'gpu-baremetal': data.gpuBaremetal.length,
    'gpu-hourly': data.gpuHourly.length,
    'text-api': data.textModels.length,
    'media-api': data.mediaModels.length,
    plans: data.plans.length,
  };

  const toggleSort = (key: string) => {
    setSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' },
    );
  };

  const hasFilters = query.trim() !== '' || providerFilter !== 'all';

  return (
    <section className="section explorer-section" id="prices">
      <div className="container">
        <SectionHead
          index="02"
          kicker="PRICE EXPLORER"
          title="价格全景"
          desc="切换维度、筛选供应商、按价格排序，或直接搜索型号。所有价格按当前币种统一折算。"
        />

        <div className="explorer">
          <div className="explorer-tabs" role="tablist" aria-label="价格分类">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={active === tab.id}
                aria-controls="price-panel"
                className={`tab${active === tab.id ? ' is-active' : ''}`}
                onClick={() => onChange(tab.id)}
              >
                {tab.label}
                <span className="tab-count">{counts[tab.id]}</span>
              </button>
            ))}
          </div>

          <div className="explorer-toolbar">
            <div className="search-field">
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索供应商、型号或区域…"
                aria-label="搜索报价"
              />
            </div>

            <label className="select-field">
              <span className="sr-only">供应商</span>
              <select
                value={providerFilter}
                onChange={(event) => setProviderFilter(event.target.value)}
              >
                <option value="all">全部供应商</option>
                {built.providers.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="currency-toggle" role="group" aria-label="显示币种">
              {(['USD', 'CNY'] as Currency[]).map((item) => (
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

            <span className="result-count">
              {visible.length} / {built.rows.length} 条
            </span>
          </div>

          <div
            id="price-panel"
            role="tabpanel"
            aria-labelledby={`tab-${active}`}
            className="table-wrap"
          >
            {visible.length === 0 ? (
              <div className="empty">
                <p>没有匹配的报价。</p>
                {hasFilters ? (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      setQuery('');
                      setProviderFilter('all');
                    }}
                  >
                    清除筛选
                  </button>
                ) : null}
              </div>
            ) : (
              <table className="price-table">
                <caption className="sr-only">
                  {TABS.find((tab) => tab.id === active)?.label} 价格明细
                </caption>
                <thead>
                  <tr>
                    {built.columns.map((column) => (
                      <th
                        key={column.key}
                        scope="col"
                        className={column.align === 'right' ? 'num' : undefined}
                        aria-sort={
                          sort.key === column.key
                            ? sort.dir === 'asc'
                              ? 'ascending'
                              : 'descending'
                            : 'none'
                        }
                      >
                        {column.sortable ? (
                          <button
                            type="button"
                            className={`th-sort${sort.key === column.key ? ' is-sorted' : ''}`}
                            onClick={() => toggleSort(column.key)}
                          >
                            {column.label}
                            <span className="sort-ind" aria-hidden="true">
                              {sort.key === column.key ? (sort.dir === 'asc' ? '↑' : '↓') : '↕'}
                            </span>
                          </button>
                        ) : (
                          column.label
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visible.map((row) => (
                    <tr key={row.id}>
                      {built.columns.map((column) => (
                        <td
                          key={column.key}
                          data-label={column.label}
                          className={column.align === 'right' ? 'num' : undefined}
                        >
                          {row.cells[column.key]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <p className="explorer-note">
            价格为公开报价的归一化样例，实际以官方页面为准；切换币种按 1 USD ={' '}
            {data.meta.rates.CNY} CNY 折算。
          </p>
        </div>
      </div>
    </section>
  );
}
