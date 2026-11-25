import { useMemo } from 'react';
import type { Category, MediaModelOffer, Snapshot, TextModelOffer } from '../types';
import { formatMoney, toUsd, unitSuffix } from '../lib/format';
import { SectionHead } from './Bits';

export function CategoryShowcase({
  data,
  onSelect,
}: {
  data: Snapshot;
  onSelect: (category: Category) => void;
}) {
  const rates = data.meta.rates;
  const cny = (usd: number) => formatMoney(usd, 'USD', 'CNY', rates);
  const providers = useMemo(
    () => new Map(data.providers.map((provider) => [provider.id, provider])),
    [data.providers],
  );

  const baremetal = useMemo(
    () =>
      [...data.gpuBaremetal]
        .sort(
          (a, b) =>
            toUsd(a.price / a.gpuCount, a.currency, rates) -
            toUsd(b.price / b.gpuCount, b.currency, rates),
        )
        .slice(0, 3),
    [data.gpuBaremetal, rates],
  );

  const ranges = useMemo(() => {
    const groups = new Map<string, { min: number; max: number }>();
    for (const row of data.gpuHourly) {
      const price = toUsd(row.price, row.currency, rates);
      const group = groups.get(row.gpu);
      if (!group) {
        groups.set(row.gpu, { min: price, max: price });
      } else {
        group.min = Math.min(group.min, price);
        group.max = Math.max(group.max, price);
      }
    }

    const entries = [...groups.entries()].sort((a, b) => a[1].min - b[1].min);
    const preferred = ['H100 SXM', 'A100 SXM', 'RTX 4090'];
    const chosen: Array<[string, { min: number; max: number }]> = [];
    for (const name of preferred) {
      const entry = entries.find(([gpu]) => gpu === name);
      if (entry) chosen.push(entry);
    }
    for (const entry of entries) {
      if (chosen.length >= 3) break;
      if (!chosen.some(([gpu]) => gpu === entry[0])) chosen.push(entry);
    }
    const domain = Math.max(...chosen.map(([, group]) => group.max), 1) * 1.05;
    return { chosen: chosen.slice(0, 3), domain };
  }, [data.gpuHourly, rates]);

  const textPicks = useMemo(() => {
    const preferred = ['GPT-4o', 'DeepSeek V3', 'Gemini 2.0 Flash'];
    const picks = preferred
      .map((model) => data.textModels.find((item) => item.model === model))
      .filter((item): item is TextModelOffer => Boolean(item));
    if (picks.length >= 3) return picks;
    return [...data.textModels.slice(0, 3)];
  }, [data.textModels]);

  const textMax = useMemo(
    () =>
      Math.max(
        ...textPicks.flatMap((model) => [
          toUsd(model.inputPerM, model.currency, rates),
          toUsd(model.outputPerM, model.currency, rates),
        ]),
        0.001,
      ),
    [textPicks, rates],
  );

  const mediaPicks = useMemo(() => {
    const preferred = ['DALL·E 3', 'FLUX 1.1 Pro', 'Sora 2', '可灵 2.1'];
    return preferred
      .map((model) => data.mediaModels.find((item) => item.model === model))
      .filter((item): item is MediaModelOffer => Boolean(item));
  }, [data.mediaModels]);

  return (
    <section className="section" id="categories">
      <div className="container">
        <SectionHead
          index="01"
          kicker="CATEGORIES"
          title="四种算力计价模型"
          desc="从整机租赁到按秒调用，把不同厂商的计费方式折算到同一维度，直接比较。"
        />

        <div className="cat-grid">
          <article className="cat-card span-7">
            <button
              type="button"
              className="cat-hit"
              onClick={() => onSelect('gpu-baremetal')}
              aria-label="查看 GPU 裸金属价格"
            >
              <div className="cat-top">
                <span className="cat-index">01</span>
                <span className="cat-chip">Bare Metal</span>
              </div>
              <h3>GPU 裸金属</h3>
              <p className="cat-desc">整机租赁，官网公开月租报价，附单卡月租折算。</p>
              <div className="mini-table">
                {baremetal.map((row) => (
                  <div className="mini-row" key={row.id}>
                    <span className="mini-prov">
                      {providers.get(row.providerId)?.short ?? row.providerId}
                    </span>
                    <span className="mini-name">{row.product}</span>
                    <span className="mini-price">
                      {formatMoney(row.price / row.gpuCount, row.currency, 'CNY', rates)}
                      <small>/卡·月</small>
                    </span>
                  </div>
                ))}
              </div>
              <span className="cat-more">
                查看全部 {data.gpuBaremetal.length} 个机型 <i>↗</i>
              </span>
            </button>
          </article>

          <article className="cat-card span-5">
            <button
              type="button"
              className="cat-hit"
              onClick={() => onSelect('gpu-hourly')}
              aria-label="查看 GPU 卡时价格"
            >
              <div className="cat-top">
                <span className="cat-index">02</span>
                <span className="cat-chip">Per GPU · Hour</span>
              </div>
              <h3>GPU 卡时</h3>
              <p className="cat-desc">单卡按需，同一型号跨市场比价。</p>
              <div className="cat-ranges">
                {ranges.chosen.map(([gpu, group]) => (
                  <div className="cat-range" key={gpu}>
                    <span className="cat-range-label">{gpu}</span>
                    <span className="cat-range-track">
                      <span
                        className="cat-range-fill"
                        style={{
                          left: `${(group.min / ranges.domain) * 100}%`,
                          width: `${Math.max(((group.max - group.min) / ranges.domain) * 100, 3)}%`,
                        }}
                      />
                    </span>
                    <span className="cat-range-val">
                      {cny(group.min)}–{cny(group.max)}
                    </span>
                  </div>
                ))}
              </div>
              <span className="cat-more">
                查看全部 {data.gpuHourly.length} 个报价 <i>↗</i>
              </span>
            </button>
          </article>

          <article className="cat-card span-5">
            <button
              type="button"
              className="cat-hit"
              onClick={() => onSelect('text-api')}
              aria-label="查看文本推理 API 价格"
            >
              <div className="cat-top">
                <span className="cat-index">03</span>
                <span className="cat-chip">Tokens</span>
              </div>
              <h3>文本推理 API</h3>
              <p className="cat-desc">输入 / 输出分开计价，按 1M tokens 对齐。</p>
              <div className="cat-pairs">
                {textPicks.map((model) => {
                  const input = toUsd(model.inputPerM, model.currency, rates);
                  const output = toUsd(model.outputPerM, model.currency, rates);
                  return (
                    <div className="pair" key={model.id}>
                      <div className="pair-head">
                        <b>{model.model}</b>
                        <small>{providers.get(model.providerId)?.short ?? model.providerId}</small>
                      </div>
                      <div className="pair-bars">
                        <span
                          className="pair-bar pair-in"
                          style={{ width: `${Math.max((input / textMax) * 100, 2)}%` }}
                        />
                        <span
                          className="pair-bar pair-out"
                          style={{ width: `${Math.max((output / textMax) * 100, 2)}%` }}
                        />
                      </div>
                      <div className="pair-vals">
                        <span>in {cny(input)}</span>
                        <span>out {cny(output)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <span className="cat-more">
                查看全部 {data.textModels.length} 个模型 <i>↗</i>
              </span>
            </button>
          </article>

          <article className="cat-card span-7">
            <button
              type="button"
              className="cat-hit"
              onClick={() => onSelect('media-api')}
              aria-label="查看图像与视频生成 API 价格"
            >
              <div className="cat-top">
                <span className="cat-index">04</span>
                <span className="cat-chip">Image / Video</span>
              </div>
              <h3>图像 · 视频生成</h3>
              <p className="cat-desc">按张、按秒与月费套餐。</p>
              <div className="media-chips">
                {mediaPicks.map((model) => (
                  <div className={`media-chip media-${model.kind}`} key={model.id}>
                    <span className="media-kind">{model.kind === 'image' ? 'IMG' : 'VID'}</span>
                    <b>{model.model}</b>
                    <span className="media-price">
                      {formatMoney(model.price, model.currency, 'CNY', rates)}
                      {unitSuffix(model.unit)}
                    </span>
                    <small>{model.resolution}</small>
                  </div>
                ))}
              </div>
              <span className="cat-more">
                查看 {data.mediaModels.length} 个模型与 {data.plans.length} 个套餐 <i>↗</i>
              </span>
            </button>
          </article>
        </div>
      </div>
    </section>
  );
}
