import fs from 'node:fs';
import path from 'node:path';
import type { Category, Overview, Snapshot } from './types.js';

export const CATEGORY_KEYS = {
  'gpu-baremetal': 'gpuBaremetal',
  'gpu-hourly': 'gpuHourly',
  'text-api': 'textModels',
  'media-api': 'mediaModels',
  plans: 'plans',
} as const satisfies Record<Category, keyof Snapshot>;

export function isCategory(value: unknown): value is Category {
  return typeof value === 'string' && value in CATEGORY_KEYS;
}

function resolveDataFile(): string {
  const candidates = [
    process.env.DATA_FILE,
    path.resolve(process.cwd(), 'data/snapshot.json'),
    path.resolve(process.cwd(), '../data/snapshot.json'),
    path.resolve(process.cwd(), 'snapshot.json'),
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error(
    `未找到价格数据快照，请检查 data/snapshot.json。已尝试：\n${candidates.join('\n')}`,
  );
}

const dataFile = resolveDataFile();
const data = JSON.parse(fs.readFileSync(dataFile, 'utf8')) as Snapshot;

type AnyRow = { id?: unknown };
type RowBag = Record<string, AnyRow[]>;

export function getSnapshot(): Snapshot {
  return data;
}

export function getOverview(): Overview {
  const counts: Overview['counts'] = {
    'gpu-baremetal': data.gpuBaremetal.length,
    'gpu-hourly': data.gpuHourly.length,
    'text-api': data.textModels.length,
    'media-api': data.mediaModels.length,
    plans: data.plans.length,
  };

  const providerIds = new Set<string>();
  for (const key of Object.values(CATEGORY_KEYS)) {
    for (const row of (data as unknown as RowBag)[key]) {
      const providerId = (row as { providerId?: unknown }).providerId;
      if (typeof providerId === 'string') providerIds.add(providerId);
    }
  }

  return {
    snapshotAt: data.meta.snapshotAt,
    providers: providerIds.size,
    records: Object.values(counts).reduce((sum, value) => sum + value, 0),
    categories: Object.keys(counts).length,
    counts,
  };
}

export interface QueryOptions {
  provider?: string;
  q?: string;
  limit?: number;
}

export function queryCategory(category: Category, options: QueryOptions = {}) {
  const key = CATEGORY_KEYS[category];
  let rows = [...(data as unknown as RowBag)[key]];

  if (options.provider) {
    rows = rows.filter(
      (row) => (row as { providerId?: string }).providerId === options.provider,
    );
  }

  if (options.q) {
    const needle = options.q.toLowerCase();
    rows = rows.filter((row) => JSON.stringify(row).toLowerCase().includes(needle));
  }

  if (options.limit && options.limit > 0) {
    rows = rows.slice(0, options.limit);
  }

  return rows;
}

export function upsertRows(category: Category, rows: unknown[]) {
  const key = CATEGORY_KEYS[category];
  const bag = data as unknown as RowBag;
  const current = bag[key] ?? [];
  const map = new Map<string, AnyRow>(
    current
      .filter((row): row is { id: string } => typeof row.id === 'string')
      .map((row) => [row.id, row]),
  );

  let applied = 0;
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const id = (row as AnyRow).id;
    if (typeof id !== 'string' || id.length === 0) continue;
    map.set(id, row);
    applied += 1;
  }

  bag[key] = Array.from(map.values());
  persist();

  return { category, applied, total: bag[key].length };
}

function persist() {
  try {
    fs.writeFileSync(dataFile, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  } catch (error) {
    console.warn('[store] 快照写入失败（可能为只读文件系统）:', error);
  }
}

export function getDataFile(): string {
  return dataFile;
}
