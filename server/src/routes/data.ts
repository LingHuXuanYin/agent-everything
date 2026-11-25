import type { FastifyInstance } from 'fastify';
import {
  getDataFile,
  getOverview,
  getSnapshot,
  isCategory,
  queryCategory,
  upsertRows,
} from '../store.js';

interface IngestBody {
  category?: unknown;
  rows?: unknown;
}

export async function dataRoutes(app: FastifyInstance) {
  app.get('/health', async () => ({
    status: 'ok',
    uptime: process.uptime(),
    snapshotAt: getSnapshot().meta.snapshotAt,
  }));

  app.get('/overview', async () => getOverview());

  app.get('/snapshot', async (_request, reply) => {
    reply.header('cache-control', 'public, max-age=60');
    return getSnapshot();
  });

  app.get('/offers', async (request, reply) => {
    const { category, provider, q, limit } = request.query as Record<
      string,
      string | undefined
    >;

    if (!isCategory(category)) {
      return reply.code(400).send({
        error:
          'category 必须为 gpu-baremetal | gpu-hourly | text-api | media-api | plans',
      });
    }

    const rows = queryCategory(category, {
      provider,
      q,
      limit: limit ? Number(limit) : undefined,
    });

    return { category, total: rows.length, rows };
  });

  // 抓取管道把归一化后的报价 POST 进来。生产环境必须配置 INGEST_TOKEN。
  app.post('/ingest', async (request, reply) => {
    const expected = process.env.INGEST_TOKEN;
    const isProd = process.env.NODE_ENV === 'production';

    if (expected) {
      if (request.headers['x-ingest-token'] !== expected) {
        return reply.code(401).send({ error: 'unauthorized' });
      }
    } else if (isProd) {
      return reply.code(503).send({ error: 'ingest disabled: INGEST_TOKEN 未配置' });
    }

    const body = (request.body ?? {}) as IngestBody;
    if (!isCategory(body.category)) {
      return reply.code(400).send({ error: 'category 无效' });
    }
    if (!Array.isArray(body.rows) || body.rows.length === 0) {
      return reply.code(400).send({ error: 'rows 必须为非空数组' });
    }

    const result = upsertRows(body.category, body.rows);
    return { ok: true, ...result, dataFile: getDataFile() };
  });
}
