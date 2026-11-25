import raw from '../../../data/snapshot.json';
import type { Snapshot } from '../types';

/**
 * 内置快照：与后端共用 data/snapshot.json。
 * 当 /api 不可用时（静态托管 / 预览环境），站点仍可完整展示。
 */
export const snapshot = raw as unknown as Snapshot;

export const providerIndex = new Map(
  snapshot.providers.map((provider) => [provider.id, provider]),
);
