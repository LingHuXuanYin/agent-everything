import { useState } from 'react';
import { SectionHead } from './Bits';

const SAMPLE = `{
  "provider": "vast.ai",
  "gpu": "H100 SXM",
  "price": 1.87,
  "unit": "gpu-hour",
  "currency": "USD"
}`;

export function ApiCta() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const origin = typeof window === 'undefined' ? '' : window.location.origin;
    const command = `curl "${origin}/api/offers?category=gpu-hourly&q=H100"`;
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="section api-section" id="api">
      <div className="container api-grid">
        <div className="api-copy">
          <SectionHead
            index="05"
            kicker="FOR AGENTS"
            title={
              <>
                把价格数据
                <br />
                接入你的 Agent。
              </>
            }
            desc="查询接口与站点共用一份快照。按分类、服务平台与关键词过滤，返回可直接计算的结构化报价。"
          />

          <ul className="api-points">
            <li>
              <b>GET /api/offers</b>
              <span>按分类与关键词查询报价</span>
            </li>
            <li>
              <b>GET /api/snapshot</b>
              <span>拉取完整价格快照</span>
            </li>
            <li>
              <b>POST /api/ingest</b>
              <span>抓取管道写入归一化报价</span>
            </li>
          </ul>

          <a className="btn btn-primary" href="#prices">
            浏览价格数据
          </a>
        </div>

        <div className="code-card">
          <div className="code-bar">
            <span>bash</span>
            <button type="button" onClick={handleCopy}>
              {copied ? '已复制' : '复制'}
            </button>
          </div>
          <pre className="code-block">
            <code>curl &quot;$ORIGIN/api/offers?category=gpu-hourly&amp;q=H100&quot;</code>
          </pre>
          <div className="code-bar code-bar-sub">
            <span>200 OK · application/json</span>
          </div>
          <pre className="code-block">
            <code>{SAMPLE}</code>
          </pre>
        </div>
      </div>
    </section>
  );
}
