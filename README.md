# agent everything

> 全网 AI 算力与模型 API 的价格情报站 · GPU 裸金属 / 卡时 / 文本推理 / 图像视频 / 月费套餐

一个对外展示的价格聚合站点：统一抓取、归一化并展示不同供应商的 GPU 租赁与模型 API 报价，按卡时、1M tokens、单张、每秒等口径直接对比，并可经由 API 接入 Agent。

## 功能

- **四类价格视图**：GPU 裸金属、GPU 卡时、文本推理 API、图像 / 视频生成 API，外加月费套餐。
- **价格浏览器**：分类切换、供应商筛选、关键词搜索、按价格/型号排序、USD/CNY 币种切换。
- **对比图表**：同型号卡时价格带、文本模型输出成本、生图/生视频单次成本。
- **实时数据 API**：站点与 Agent 共用同一份快照；API 不可用时自动回退到内置快照。
- **抓取入库接口**：抓取管道可将归一化后的报价 POST 到 `/api/ingest`。

## 项目结构

```
agent-everything/
├── data/
│   └── snapshot.json          # 唯一价格数据源（前后端共用）
├── server/                    # Fastify 数据 API
│   └── src/
│       ├── index.ts           # 服务入口
│       ├── store.ts           # 快照加载 / 查询 / 入库
│       ├── types.ts
│       └── routes/data.ts     # /health /overview /snapshot /offers /ingest
├── web/                       # React + Vite 展示站
│   └── src/
│       ├── App.tsx
│       ├── styles.css
│       ├── components/        # Hero / 分类卡 / 价格浏览器 / 图表 / 方法论 / API
│       └── data/snapshot.ts   # 内置快照回退
├── docker-compose.yml         # web(10001) + api(10002)
└── package.json               # npm workspaces
```

## 本地开发

需要 Node.js 20+。

```bash
npm install
npm run dev
```

- 展示站：http://localhost:5173
- 数据 API：http://localhost:3001/api/overview

单独启动：

```bash
npm run dev:web
npm run dev:server
```

## 构建

```bash
npm run build          # 构建 web + server
npm run typecheck      # 类型检查
npm start              # 运行编译后的 API
```

## 数据 API

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/health` | 健康检查 |
| GET | `/api/overview` | 覆盖统计与快照时间 |
| GET | `/api/snapshot` | 完整价格快照 |
| GET | `/api/offers?category=&provider=&q=&limit=` | 分类查询 / 过滤 |
| POST | `/api/ingest` | 抓取管道写入报价（需 `INGEST_TOKEN`） |

`category` 取值：`gpu-baremetal`、`gpu-hourly`、`text-api`、`media-api`、`plans`。

```bash
curl "http://localhost:3001/api/offers?category=gpu-hourly&q=H100"
```

写入示例：

```bash
curl -X POST "http://localhost:3001/api/ingest" \
  -H "content-type: application/json" \
  -H "x-ingest-token: $INGEST_TOKEN" \
  -d '{"category":"gpu-hourly","rows":[{"id":"hr-example","providerId":"vast","gpu":"H100 SXM","gpuCount":1,"vramGb":80,"price":1.79,"currency":"USD","region":"Marketplace","minTerm":"按秒计费","availability":"available","sourceUrl":"https://vast.ai/pricing"}]}'
```

报价按 `id` 合并去重，写入 `data/snapshot.json`（文件系统只读时仅保留在内存中）。

## Docker

```bash
docker compose up -d --build
```

- Web：http://localhost:10001
- API：http://localhost:10002/api/overview

生产环境请修改 `docker-compose.yml` 中的 `INGEST_TOKEN`。

## 数据说明

`data/snapshot.json` 当前为**演示快照**，用于展示数据结构与对比能力；价格来自公开报价的归一化样例，实际价格以各厂商官方渠道为准。接入抓取管道后，可替换为每日刷新的真实数据。
