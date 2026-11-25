#!/usr/bin/env node
/**
 * 用无头浏览器抓取渲染型页面，并更新可稳定解析的两类价格：
 *   - 极智算 GPU 裸金属（整机月租）
 *   - 共绩算力 卡时价格表（元/小时）
 *
 * 其余渲染页面由 scripts/render-capture.mjs 输出文本，供人工 / 定时任务核对后
 * 用 scripts/refresh-prices.mjs --set 写入。
 *
 * 用法：
 *   node scripts/refresh-rendered.mjs            # 抓取并写回
 *   node scripts/refresh-rendered.mjs --dry-run  # 只打印差异
 *   node scripts/refresh-rendered.mjs --force    # 允许单次变动超过 30%
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SNAPSHOT = path.join(ROOT, 'data/snapshot.json');
const MAX_CHANGE = 0.3;
const dryRun = process.argv.includes('--dry-run');
const force = process.argv.includes('--force');

/** 极智算裸金属：按机型 + 区域映射到已有记录 */
const JY_BMS_RULES = [
  [/B300/, null, 'bm-jygpu-b300'],
  [/H200/, null, 'bm-jygpu-h200'],
  [/H100/, /吉林/, 'bm-jygpu-h100-jl'],
  [/H100/, null, 'bm-jygpu-h100-nx'],
  [/H800/, null, 'bm-jygpu-h800'],
  [/H20-141/, null, 'skip'],
  [/H20/, null, 'bm-jygpu-h20-96'],
  [/A100-80/, null, 'bm-jygpu-a100-80'],
  [/A100-40/, null, 'bm-jygpu-a100-40'],
  [/A800/, null, 'bm-jygpu-a800'],
  [/910B/, /华为/, 'bm-jygpu-910b-hw'],
  [/910B/, null, 'bm-jygpu-910b-sc'],
  [/4090-48/, null, 'bm-jygpu-4090-48'],
  [/4090-24/, null, 'bm-jygpu-4090-24'],
  [/S60/, null, 'bm-jygpu-s60'],
  [/5090/, /安徽/, 'bm-jygpu-5090-ah'],
  [/5090/, null, 'bm-jygpu-5090-ha'],
];

function mapJygpu(name, region) {
  for (const [re, regionRe, id] of JY_BMS_RULES) {
    if (!re.test(name)) continue;
    if (regionRe && !regionRe.test(region)) continue;
    return id;
  }
  return null;
}

/** 共绩算力卡时表：机型 + 显存 → 已有记录 */
const GONGJI_FIXED = [
  [/PRO6000D/, 'gh-gongji-pro6000d'],
  [/PRO6000/, 'gh-gongji-pro6000'],
  [/4090.*48/, 'gh-gongji-4090-48'],
  [/4090/, 'gh-gongji-4090-24'],
  [/5090/, 'gh-gongji-5090-32'],
  [/^H20-96/, 'gh-gongji-h20-96'],
  [/^H20-141/, 'gh-gongji-h20-141'],
  [/H800/, 'gh-gongji-h800'],
  [/H100/, 'gh-gongji-h100'],
  [/H200/, 'gh-gongji-h200'],
  [/A100.*80/, 'gh-gongji-a100-80'],
  [/A100.*40/, 'gh-gongji-a100-40'],
  [/A800.*80/, 'gh-gongji-a800-80'],
  [/A800.*40/, 'gh-gongji-a800-40'],
  [/L40S/, 'gh-gongji-l40s'],
  [/L40/, 'gh-gongji-l40'],
  [/L20/, 'gh-gongji-l20'],
  [/S4000/, 'gh-gongji-s4000'],
  [/910B2/, 'gh-gongji-910b2'],
  [/910C/, 'gh-gongji-910c'],
  [/BW1000/, 'gh-gongji-bw1000'],
  [/P800/, 'gh-gongji-p800'],
];

function mapGongji(name, vram) {
  const key = `${name}${vram}G`.toUpperCase().replace(/\s+/g, '');
  for (const [re, id] of GONGJI_FIXED) if (re.test(key)) return id;
  return null;
}

function nowShanghai() {
  const shifted = new Date(Date.now() + 8 * 3600_000);
  return `${shifted.toISOString().slice(0, 19)}+08:00`;
}

async function main() {
  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    console.error('未安装 playwright');
    process.exit(2);
  }

  const snapshot = JSON.parse(fs.readFileSync(SNAPSHOT, 'utf8'));
  const bmById = new Map(snapshot.gpuBaremetal.map((row) => [row.id, row]));
  const ghById = new Map(snapshot.gpuHourly.map((row) => [row.id, row]));

  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const updates = [];
  const problems = [];

  // 极智算裸金属
  {
    const page = await browser.newPage({ locale: 'zh-CN' });
    try {
      await page.goto('https://www.jygpu.com/markets/bms', { waitUntil: 'domcontentloaded', timeout: 60_000 });
      await page.waitForTimeout(4_000);
      const cards = await page.evaluate(() => {
        const out = [];
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
        while (walker.nextNode()) {
          const el = walker.currentNode;
          const text = (el.innerText || '').trim();
          if (!/^(NVIDIA|华为|燧原)-?[\w\s-]*\d+卡$/.test(text) || text.length > 40) continue;
          let box = el;
          for (let i = 0; i < 6 && box; i += 1) {
            if ((box.innerText || '').includes('预估单价')) break;
            box = box.parentElement;
          }
          const price = (box?.innerText || '').match(/预估单价\s*\n?\s*¥\s*\n?\s*([\d.,]+)/);
          const lines = (box?.innerText || '').split('\n').map((s) => s.trim()).filter(Boolean);
          const idx = lines.indexOf(text);
          const region = idx >= 0 ? lines[idx + 1] ?? '' : '';
          if (price) out.push({ name: text, region, price: Number(price[1].replace(/,/g, '')) });
        }
        return out;
      });
      if (cards.length < 10) problems.push(`极智算裸金属仅解析 ${cards.length} 张卡片，低于阈值 10`);
      for (const card of cards) {
        const id = mapJygpu(card.name, card.region);
        if (id === 'skip') continue;
        if (!id) {
          problems.push(`极智算未匹配机型：${card.name} / ${card.region} / ¥${card.price}`);
          continue;
        }
        updates.push({ id, price: card.price, bucket: 'bm', source: '极智算裸金属' });
      }
      console.log(`[抓取] 极智算裸金属：${cards.length} 张卡片`);
    } catch (error) {
      problems.push(`极智算裸金属抓取失败：${error.message}`);
    } finally {
      await page.close();
    }
  }

  // 共绩算力卡时
  {
    const page = await browser.newPage({ locale: 'zh-CN' });
    try {
      await page.goto('https://suanli.cn/price/', { waitUntil: 'domcontentloaded', timeout: 60_000 });
      await page.waitForTimeout(4_000);
      const text = await page.evaluate(() => document.body.innerText);
      const rows = [];
      const re = /^(.+?)\s+(\d+)\s*G\s+([\d.]+)\s*元\/小时\s*$/gm;
      let m;
      while ((m = re.exec(text))) rows.push({ name: m[1].trim(), vram: Number(m[2]), price: Number(m[3]) });
      if (rows.length < 8) problems.push(`共绩卡时仅解析 ${rows.length} 行，低于阈值 8`);
      for (const row of rows) {
        const id = mapGongji(row.name, row.vram);
        if (!id) {
          problems.push(`共绩未匹配机型：${row.name} ${row.vram}G ¥${row.price}`);
          continue;
        }
        updates.push({ id, price: row.price, bucket: 'gh', source: '共绩卡时' });
      }
      console.log(`[抓取] 共绩卡时：${rows.length} 行`);
    } catch (error) {
      problems.push(`共绩卡时抓取失败：${error.message}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();

  const changes = [];
  const skipped = [];
  for (const update of updates) {
    const row = (update.bucket === 'bm' ? bmById : ghById).get(update.id);
    if (!row) {
      problems.push(`未知记录 ${update.id}`);
      continue;
    }
    const delta = (update.price - row.price) / row.price;
    if (Math.abs(delta) > MAX_CHANGE && !force) {
      skipped.push(`${update.id} ${row.price} → ${update.price}（${(delta * 100).toFixed(1)}%）`);
      continue;
    }
    if (update.price !== row.price) {
      changes.push({ id: update.id, from: row.price, to: update.price, source: update.source });
      row.price = update.price;
    }
  }

  if (changes.length) {
    console.log('\n价格变动：');
    for (const c of changes) console.log(`  ${c.id.padEnd(22)} ${c.from} → ${c.to}  (${c.source})`);
  } else {
    console.log('\n无价格变动。');
  }
  if (skipped.length) {
    console.log('\n超出 30% 变动、需人工确认：');
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
  console.log(`\n已写入快照：变动 ${changes.length} 条，跳过 ${skipped.length} 条，告警 ${problems.length} 条`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
