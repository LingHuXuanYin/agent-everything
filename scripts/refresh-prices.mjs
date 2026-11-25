#!/usr/bin/env node
/**
 * 每日价格刷新脚本。
 *
 * 覆盖可静态解析的官网页面：
 *   - 猿界算力 高性能算力 / 推理算力（整机月租）
 *   - 算力圈 首页 GPU 物理服务器（整机预估价）
 *
 * 其余前端渲染站点（极智算、共绩、阿里云、腾讯云、百度智能云）无法直接 HTTP 解析，
 * 由每日定时任务通过渲染抓取后使用 --set id=price 写入，同样经过变更护栏。
 *
 * 用法：
 *   node scripts/refresh-prices.mjs             # 抓取并写回 data/snapshot.json
 *   node scripts/refresh-prices.mjs --dry-run   # 只打印差异，不写文件
 *   node scripts/refresh-prices.mjs --force     # 允许单次变动超过 30%
 *   node scripts/refresh-prices.mjs --set bm-jygpu-h100-s8=13.20 [--set ...]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SNAPSHOT = path.join(ROOT, 'data/snapshot.json');
const UA = 'Mozilla/5.0 (compatible; agent-everything-bot/1.0)';
const MAX_CHANGE = 0.3;

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const force = args.includes('--force');
const manual = [];
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === '--set') {
    const pair = args[i + 1] ?? '';
    const [id, price] = pair.split('=');
    if (!id || !Number.isFinite(Number(price))) {
      console.error(`--set 参数无效：${pair}，应为 <row-id>=<price>`);
      process.exit(2);
    }
    manual.push({ id, price: Number(price), source: 'manual' });
  }
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { 'user-agent': UA, accept: 'text/html' },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`${url} 返回 ${res.status}`);
  return res.text();
}

/** 猿界算力：价格 div + h5 标题，按标题匹配现有记录 */
const YUANJIE_RULES = [
  [/^B200/, 'bm-yj-b200-8'],
  [/^H200/, 'bm-yj-h200-8'],
  [/^H100/, 'bm-yj-h100-8'],
  [/^H800/, 'bm-yj-h800-8'],
  [/^A100 8卡/, 'bm-yj-a100-80-8'],
  [/^A800 8卡.*PCIE/, 'bm-yj-a800-80-8-pcie'],
  [/^A800 8卡/, 'bm-yj-a800-80-8'],
  [/^A800 80G 2卡/, 'bm-yj-a800-80-2'],
  [/^A100 40G 8卡/, 'bm-yj-a100-40-8'],
  [/^A100 40G 4卡/, 'bm-yj-a100-40-4'],
  [/910B2/, 'bm-yj-910b2-8'],
  [/910B3/, 'bm-yj-910b3-8'],
  [/910B4/, 'bm-yj-910b4-8'],
  [/^H20/, 'bm-yj-h20-8'],
  [/PRO 6000D/i, 'bm-yj-pro6000d-8'],
  [/^5090/, 'bm-yj-5090-8'],
  [/^4090/, 'bm-yj-4090-8'],
  [/^V100/, 'bm-yj-v100-32-8'],
  [/^3090/, 'bm-yj-3090-8'],
  [/^L40/, 'bm-yj-l40-8'],
  [/^L20/, 'bm-yj-l20-8'],
];

const SUANLIQUAN_RULES = [
  [/4090/, 'bm-slq-4090'],
  [/5090/, 'bm-slq-5090'],
  [/H20/, 'bm-slq-h20-141'],
];

function parseApetops(html, pageUrl) {
  const items = [];
  const re = /￥(\d+)元\/月/g;
  let m;
  while ((m = re.exec(html))) {
    const tail = html.slice(m.index + m[0].length, m.index + m[0].length + 800);
    const title = tail.match(/<h5>([^<]+)<\/h5>/)?.[1]?.trim();
    if (!title) continue;
    items.push({ title, price: Number(m[1]), pageUrl });
  }
  return items;
}

function parseSuanliquan(html, pageUrl) {
  const items = [];
  for (const part of html.split('class="gpubm-item"').slice(1)) {
    const title = part.match(/class="gpubm-name">([^<]+)</)?.[1]?.trim();
    const price = part.match(/gpubm-price-num">¥([0-9.]+)/)?.[1];
    if (title && price) items.push({ title, price: Number(price), pageUrl });
  }
  return items;
}

function match(items, rules) {
  const matched = [];
  const unmatched = [];
  for (const item of items) {
    const rule = rules.find(([re]) => re.test(item.title));
    if (!rule) {
      unmatched.push(item);
      continue;
    }
    matched.push({ ...item, id: rule[1] });
  }
  return { matched, unmatched };
}

function nowShanghai() {
  const shifted = new Date(Date.now() + 8 * 3600_000);
  return `${shifted.toISOString().slice(0, 19)}+08:00`;
}

async function main() {
  const snapshot = JSON.parse(fs.readFileSync(SNAPSHOT, 'utf8'));
  const rows = snapshot.gpuBaremetal;
  const byId = new Map(rows.map((row) => [row.id, row]));

  const plan = [];
  const problems = [];
  let fetched = 0;

  const sources = [
    { name: '猿界·高性能', url: 'https://apetops.com/gaoxingnengsuanli/', parse: parseApetops, rules: YUANJIE_RULES, min: 10 },
    { name: '猿界·推理', url: 'https://apetops.com/tongyongsuanli/', parse: parseApetops, rules: YUANJIE_RULES, min: 8 },
    { name: '算力圈', url: 'https://www.suanliquan.com/', parse: parseSuanliquan, rules: SUANLIQUAN_RULES, min: 3 },
  ];

  for (const source of sources) {
    try {
      const html = await fetchText(source.url);
      const { matched, unmatched } = match(source.parse(html, source.url), source.rules);
      fetched += 1;
      if (matched.length < source.min) {
        problems.push(`${source.name} 仅解析到 ${matched.length} 条，低于阈值 ${source.min}，已跳过该来源`);
        continue;
      }
      const seen = new Set();
      for (const item of matched) {
        if (seen.has(item.id)) {
          problems.push(`${source.name} 出现重复机型 ${item.title} → ${item.id}`);
          continue;
        }
        seen.add(item.id);
        plan.push({ ...item, sourceName: source.name });
      }
      if (unmatched.length) {
        console.log(`[未纳入] ${source.name}：${unmatched.map((u) => `${u.title} ¥${u.price}`).join('；')}`);
      }
      console.log(`[抓取] ${source.name}：解析 ${matched.length} 条`);
    } catch (error) {
      problems.push(`${source.name} 抓取失败：${error.message}`);
    }
  }

  for (const item of manual) plan.push({ ...item, sourceName: '手动核对' });

  const changes = [];
  const skipped = [];
  for (const item of plan) {
    const row = byId.get(item.id);
    if (!row) {
      problems.push(`未知记录 ${item.id}（${item.title}）`);
      continue;
    }
    if (!Number.isFinite(item.price) || item.price <= 0) {
      problems.push(`${item.id} 价格无效：${item.price}`);
      continue;
    }
    const delta = (item.price - row.price) / row.price;
    if (Math.abs(delta) > MAX_CHANGE && !force) {
      skipped.push(`${item.id} ${row.price} → ${item.price}（${(delta * 100).toFixed(1)}%）`);
      continue;
    }
    if (item.price !== row.price || (item.pageUrl && item.pageUrl !== row.sourceUrl)) {
      changes.push({ id: item.id, product: row.product, from: row.price, to: item.price, source: item.sourceName });
    }
    row.price = item.price;
    if (item.pageUrl) row.sourceUrl = item.pageUrl;
  }

  if (changes.length) {
    console.log('\n价格变动：');
    for (const c of changes) {
      const mark = c.to === c.from ? '来源' : `${c.from} → ${c.to}`;
      console.log(`  ${c.id.padEnd(22)} ${c.product.padEnd(26)} ${mark}  (${c.source})`);
    }
  } else {
    console.log('\n无价格变动。');
  }
  if (skipped.length) {
    console.log('\n超出 30% 变动幅度、需人工确认后加 --force 重跑：');
    for (const s of skipped) console.log(`  ${s}`);
  }
  if (problems.length) {
    console.log('\n告警：');
    for (const p of problems) console.log(`  ${p}`);
  }

  if (dryRun) {
    console.log('\n[dry-run] 未写入文件。');
    return;
  }

  snapshot.meta.snapshotAt = nowShanghai();
  const tmp = `${SNAPSHOT}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
  fs.renameSync(tmp, SNAPSHOT);

  const CATEGORY_FIELDS = ['gpuBaremetal', 'gpuHourly', 'textModels', 'mediaModels', 'plans'];
  const total = CATEGORY_FIELDS.reduce((sum, key) => sum + snapshot[key].length, 0);
  console.log(`\n已写入 ${path.relative(ROOT, SNAPSHOT)}：${snapshot.gpuBaremetal.length} 条裸金属，共 ${total} 条记录，快照时间 ${snapshot.meta.snapshotAt}`);
  console.log(`来源成功 ${fetched}/${sources.length}，变动 ${changes.length} 条，跳过 ${skipped.length} 条，告警 ${problems.length} 条`);

  if (fetched === 0 && manual.length === 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
