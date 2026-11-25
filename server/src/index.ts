/**
 * agent-everything · 价格数据 API
 *
 * 开发：npm run dev --workspace=server   (tsx watch)
 * 生产：npm run build && npm start       (node dist/index.js)
 *
 * 生产模式下若找到前端构建产物（web/dist），同一端口同时托管静态站点与 API。
 */

import fs from 'node:fs';
import path from 'node:path';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import { dataRoutes } from './routes/data.js';
import { getDataFile, getSnapshot } from './store.js';

const PORT = Number(process.env.PORT ?? 3001);
const HOST = process.env.HOST ?? '0.0.0.0';
const WEB_ORIGIN = process.env.WEB_ORIGIN ?? 'http://localhost:5173';

function resolveWebRoot(): string | null {
  const candidates = [
    process.env.WEB_DIST,
    path.resolve(process.cwd(), 'web/dist'),
    path.resolve(process.cwd(), 'web'),
    path.resolve(process.cwd(), '../web/dist'),
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, 'index.html'))) return candidate;
  }
  return null;
}

async function bootstrap() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
      ...(process.env.LOG_PRETTY === '1' && {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'HH:MM:ss' },
        },
      }),
    },
  });

  await app.register(cors, {
    origin: [WEB_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST', 'OPTIONS'],
  });

  const webRoot = resolveWebRoot();
  if (webRoot) {
    await app.register(fastifyStatic, { root: webRoot, prefix: '/' });
    app.log.info(`🌐 静态站点目录：${webRoot}`);
  }

  app.setNotFoundHandler((request, reply) => {
    const wantsHtml =
      request.method === 'GET' &&
      (request.headers.accept ?? '').includes('text/html');
    if (webRoot && wantsHtml && !request.url.startsWith('/api')) {
      return reply.sendFile('index.html');
    }
    return reply.code(404).send({ error: 'not found' });
  });

  app.get('/health', async () => ({ status: 'ok', uptime: process.uptime() }));

  await app.register(dataRoutes, { prefix: '/api' });

  try {
    await app.listen({ port: PORT, host: HOST });
    const snapshot = getSnapshot();
    app.log.info(`🚀 agent-everything API · http://localhost:${PORT}`);
    app.log.info(`📦 数据文件：${getDataFile()}`);
    app.log.info(
      `📊 ${snapshot.gpuBaremetal.length + snapshot.gpuHourly.length + snapshot.textModels.length + snapshot.mediaModels.length + snapshot.plans.length} 条报价 · ${snapshot.meta.snapshotAt}`,
    );
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

bootstrap();
