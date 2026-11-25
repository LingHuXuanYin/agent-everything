/**
 * agent-everything · 价格数据 API
 *
 * 开发：npm run dev --workspace=server   (tsx watch)
 * 生产：npm run build && npm start       (node dist/index.js)
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import { dataRoutes } from './routes/data.js';
import { getDataFile, getSnapshot } from './store.js';

const PORT = Number(process.env.PORT ?? 3001);
const HOST = process.env.HOST ?? '0.0.0.0';
const WEB_ORIGIN = process.env.WEB_ORIGIN ?? 'http://localhost:5173';

async function bootstrap() {
  const isDev = process.env.NODE_ENV !== 'production';

  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
      ...(isDev && {
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
