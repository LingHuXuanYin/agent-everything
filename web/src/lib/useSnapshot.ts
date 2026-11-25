import { useEffect, useState } from 'react';
import { snapshot as fallback } from '../data/snapshot';
import type { Snapshot } from '../types';

/**
 * 优先读取 /api/snapshot；失败则回退到内置快照（静态托管也能完整展示）。
 */
export function useSnapshot() {
  const [data, setData] = useState<Snapshot>(fallback);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    fetch('/api/snapshot', { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : Promise.reject(response.status)))
      .then((json: Snapshot) => {
        if (json && json.meta && Array.isArray(json.gpuHourly)) {
          setData(json);
          setLive(true);
        }
      })
      .catch(() => {
        // 保持内置快照，不阻塞展示
      });

    return () => controller.abort();
  }, []);

  return { data, live };
}
