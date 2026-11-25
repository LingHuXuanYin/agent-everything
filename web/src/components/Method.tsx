import type { Snapshot } from '../types';
import { SectionHead } from './Bits';

const STEPS = [
  {
    no: '01',
    title: '抓取',
    body: '覆盖官网定价页、云厂商价格接口、算力市场与模型平台，按小时采集公开报价。',
  },
  {
    no: '02',
    title: '归一化',
    body: '统一币种、计费单位与 GPU 型号，折算到卡时、1M tokens、单张图片与每秒视频。',
  },
  {
    no: '03',
    title: '校验',
    body: '与历史快照交叉比对，标记异常波动、候补队列与库存紧张状态。',
  },
  {
    no: '04',
    title: '发布',
    body: '输出快照 JSON 与查询 API，网站与 Agent 共用同一份价格数据。',
  },
];

export function Method({ data }: { data: Snapshot }) {
  return (
    <section className="section" id="method">
      <div className="container">
        <SectionHead
          index="04"
          kicker="METHODOLOGY"
          title="数据获取"
          desc="抓取、归一化、校验、发布。"
        />

        <div className="method-grid">
          <ol className="steps">
            {STEPS.map((step) => (
              <li className="step" key={step.no}>
                <span className="step-no">{step.no}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </div>
              </li>
            ))}
          </ol>

          <aside className="sources">
            <h3>覆盖来源</h3>
            <div className="source-chips">
              {data.providers.map((provider) => (
                <span
                  key={provider.id}
                  className={`source-chip src-${provider.region.toLowerCase()}`}
                >
                  {provider.name}
                </span>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
