import { BrandMark } from './Bits';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <BrandMark />
          <div>
            <b>agent everything</b>
            <p>AI 算力与模型 API 的价格情报站。</p>
          </div>
        </div>

        <nav className="footer-links" aria-label="页脚导航">
          <a href="#categories">分类</a>
          <a href="#prices">报价单</a>
          <a href="#charts">对比</a>
          <a href="#method">数据获取</a>
          <a href="#api">API</a>
        </nav>

        <p className="footer-legal">
          © {year} agent everything · 当前展示为演示快照，实际价格以各厂商官方渠道为准。
        </p>
      </div>
    </footer>
  );
}
