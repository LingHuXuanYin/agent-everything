#!/usr/bin/env node
/**
 * 用无头浏览器抓取前端渲染的价格页面，保存可见文本，供每日核对价格使用。
 *
 * 用法：
 *   node scripts/render-capture.mjs                 # 抓取全部来源
 *   node scripts/render-capture.mjs --only jygpu-bms,gongji
 *   node scripts/render-capture.mjs --out-dir /tmp/cap
 *
 * 输出：data/rendered/<slug>.txt（含 URL 与抓取时间；该目录不入库）
 * 说明：只负责抓页面文本，不修改 data/snapshot.json。
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const outArg = args.indexOf('--out-dir');
const OUT_DIR = outArg >= 0 ? path.resolve(args[outArg + 1]) : path.join(ROOT, 'data/rendered');
const onlyArg = args.indexOf('--only');
const only = onlyArg >= 0 ? new Set((args[onlyArg + 1] ?? '').split(',')) : null;

const SOURCES = [
  { slug: 'jygpu-bms', provider: 'jygpu', url: 'https://www.jygpu.com/markets/bms', label: '极智算 GPU 裸金属' },
  { slug: 'jygpu-hourly', provider: 'jygpu', url: 'https://www.jygpu.com/markets', label: '极智算 GPU 卡时' },
  { slug: 'jygpu-models', provider: 'jygpu', url: 'https://www.jygpu.com/models', label: '极智算 模型 token' },
  { slug: 'gongji-price', provider: 'gongji', url: 'https://suanli.cn/price/', label: '共绩算力 价格' },
  { slug: 'aliyun-ecs', provider: 'aliyun', url: 'https://www.aliyun.com/price/ecs/ecs-pricing/zh', label: '阿里云 ECS 价格' },
  { slug: 'tencent-gpu', provider: 'tencent', url: 'https://cloud.tencent.com/product/gpu/', label: '腾讯云 GPU 产品' },
  { slug: 'tencent-gpu-doc', provider: 'tencent', url: 'https://cloud.tencent.com/document/product/851/74108', label: '腾讯云 GPU 实例价格文档' },
  { slug: 'baidu-gpu-price', provider: 'baidu', url: 'https://cloud.baidu.com/product-price/gpu.html', label: '百度智能云 GPU 价格' },
];

function stamp() {
  const shifted = new Date(Date.now() + 8 * 3600_000);
  return `${shifted.toISOString().slice(0, 19)}+08:00`;
}

async function main() {
  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    console.error('未安装 playwright，请先执行 npm i -D playwright && npx playwright install chromium');
    process.exit(2);
  }

  const targets = SOURCES.filter((s) => !only || only.has(s.slug));
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const results = [];

  for (const source of targets) {
    const page = await browser.newPage({ locale: 'zh-CN' });
    try {
      await page.goto(source.url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
      await page.waitForTimeout(4_000);
      const text = await page.evaluate(() => document.body.innerText.replace(/\n{3,}/g, '\n\n'));
      const header = `# ${source.label}\n# provider: ${source.provider}\n# url: ${source.url}\n# capturedAt: ${stamp()}\n\n`;
      fs.writeFileSync(path.join(OUT_DIR, `${source.slug}.txt`), header + text, 'utf8');
      const priced = (text.match(/[¥￥]\s*\d[\d.,]*/g) ?? []).length;
      results.push({ slug: source.slug, ok: true, chars: text.length, prices: priced });
      console.log(`[OK] ${source.slug.padEnd(16)} ${String(text.length).padStart(6)} 字符，${priced} 处价格`);
    } catch (error) {
      results.push({ slug: source.slug, ok: false, error: error.message });
      console.log(`[FAIL] ${source.slug.padEnd(16)} ${error.message}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();

  const okCount = results.filter((r) => r.ok).length;
  console.log(`\n完成 ${okCount}/${results.length}，输出目录 ${path.relative(ROOT, OUT_DIR) || '.'}`);
  if (okCount === 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
