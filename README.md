# agent everything

> 全网 AI 算力与模型 API 的价格情报站 · GPU 裸金属 / 卡时 / 文本推理 / 图像视频 / 月费套餐

一个对外展示的价格聚合站点：统一抓取、归一化并展示不同供应商的 GPU 租赁与模型 API 报价，按卡时、1M tokens、单张、每秒等口径直接对比，并可经由 API 接入 Agent。

## 在线 Demo

**https://37lvjcp7on9p9q0ph26.traesite.cn**

- 展示站与数据 API 同一域名：`/api/overview`、`/api/snapshot`、`/api/offers?category=gpu-hourly&q=H100`
- 无需登录，所有人可见

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
│   ├── snapshot.json          # 唯一价格数据源（前后端共用）
│   └── sources.json           # 数据源注册表（抓取入口清单）
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
├── build.sh / run.sh          # 部署构建与启动脚本
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

## 部署

仓库根目录的 `build.sh` / `run.sh` 是部署适配脚本，部署平台直接复用，不再依赖临时脚本：

- `build.sh`：`npm ci`（官方源）→ `npm run build` → prune → 组装 `dist/`（server + web/dist + data + 生产 node_modules）
- `run.sh`：在 `dist/` 内以单进程启动，监听 `PORT`（默认 8000），同时托管站点与 `/api`

产物结构：

```
dist/
├── server/index.js     # Fastify 入口
├── web/dist/           # 前端构建产物
├── data/snapshot.json  # 价格快照
├── node_modules/       # 生产依赖
└── run.sh
```

## 数据源

当前已配置并核验的抓取来源（完整入口、字段说明与解析备注见 [data/sources.json](data/sources.json)）：

| 来源 | 裸金属 | 卡时 | token | 已入库 | 状态 |
| --- | :---: | :---: | :---: | --- | --- |
| 极智算 jygpu.com | ✅ | ✅ | ✅ | 16 / 11 / 12 | 已接入 |
| 共绩算力 suanli.cn | ✅ | ✅ | ✅ | 11 / 22 / 7 | 已接入 |
| 猿界算力 apetops.com | ✅ | — | — | 21 | 已接入 |
| 算力圈 suanliquan.com | ✅ | — | — | 3 | 已接入 |
| 阿里云 aliyun.com | ✅ | 待确认 | 待确认 | 1 | 已接入 |
| 腾讯云 cloud.tencent.com | ✅ | ✅ | — | 1 / 1 | 已接入 |
| 百度智能云 cloud.baidu.com | 待确认 | ✅ | 待确认 | 4 | 已接入 |
| 极云科技 | — | — | — | — | 极智算运营方，数据并入 jygpu |

裸金属取整机月租，卡时按单卡归一化，token 价按 1M tokens 记。`sources.json` 中 `status=verified` 表示该入口已人工核验并能解析出价格，`pending` 表示入口待确认或需登录 / 前端渲染。

### 每日自动更新

```bash
npm run crawl:check   # 只抓取并打印差异，不写文件
npm run crawl         # 抓取并写回 data/snapshot.json
```

- 可静态解析的来源：猿界算力（高性能 / 推理两页）、算力圈首页，按机型匹配现有记录并更新月租；
- 前端渲染来源（极智算、共绩、阿里云、腾讯云、百度智能云）需渲染后核对，使用 `node scripts/refresh-prices.mjs --set <row-id>=<价格>` 写入；
- 单次变动超过 30% 会被跳过，确认无误后加 `--force`；每次写入同步更新 `meta.snapshotAt`。

### 欢迎补充数据源

这是一个开放的比价项目，欢迎通过 PR 补充新的供应商或价格入口：

1. 在 [data/sources.json](data/sources.json) 的 `sources` 中新增来源（或在已有来源下补 `targets`），填写 `providerId`、官网、维度、URL 与解析备注；
2. 新供应商需同时在 `snapshot.json` 的 `providers` 中登记 `id` / `name` / `homepage`；
3. 附上一条可复现的样例报价（型号、价格、计费单位、抓取时间），确认后把 `status` 改为 `verified`；
4. 只采集公开挂牌价，遵守目标站点 robots.txt 与访问频率限制。

也欢迎直接开 Issue 提供线索（官网链接 + 截图即可），我们来接。

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

## 数据持久化

部署环境是单进程 FunctionWeb，**实例本地文件系统不持久**：写入 `data/snapshot.json` 的改动（包括 `POST /api/ingest`）只在该实例生命周期内有效，重新部署或实例回收后丢失，多实例之间也不共享。

因此当前采用「数据随构建产物发布」的方式：

1. 抓取在构建前完成，`data/snapshot.json` 跟随源码进入构建产物；
2. 每次更新提交到 Git，再重新部署，新版本即携带新数据；
3. 站点读取的是 `dist/data/snapshot.json`，前端另有打包快照作为 API 不可用时的回退。

需要更高实时性时，可改为外部存储：把快照写入数据库或对象存储（PostgreSQL、Redis、COS/OSS 等），API 启动时读取并定期刷新，写入不再依赖部署。届时 `server/src/store.ts` 只需替换读取来源。

## 数据说明

`data/snapshot.json` 当前共 140 条报价，覆盖 23 家有效供应商：

- **已人工核验**（2026-11-25）：GPU 裸金属 53 条、GPU 卡时 38 条、文本模型 token 19 条，均来自上表厂商官网公开报价；
- **演示样例**：生图 / 生视频 API 18 条、月费套餐 12 条，用于展示数据结构，接入抓取管道后替换。

价格会随厂商调价与库存变化，实际以下单页为准。接入抓取管道后，可按 `sources.json` 的清单每日刷新并替换快照。
