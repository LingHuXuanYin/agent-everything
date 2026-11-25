import { useEffect, useState } from 'react';
import { BrandMark } from './Bits';

const LINKS = [
  { href: '#categories', label: '分类' },
  { href: '#prices', label: '报价单' },
  { href: '#charts', label: '对比' },
  { href: '#method', label: '数据方法' },
  { href: '#api', label: 'API' },
];

export function Nav({ live }: { live: boolean }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`nav${scrolled ? ' is-scrolled' : ''}`}>
      <div className="container nav-inner">
        <a className="brand" href="#top" aria-label="agent everything — 回到顶部">
          <BrandMark />
          <span className="brand-word">
            agent <b>everything</b>
          </span>
        </a>

        <nav className="nav-links" aria-label="主导航">
          {LINKS.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>

        <div className="nav-right">
          <span
            className={`live-pill${live ? ' is-live' : ''}`}
            title={live ? '已连接实时数据 API' : '当前使用内置数据快照'}
          >
            <i aria-hidden="true" />
            {live ? 'LIVE' : 'SNAPSHOT'}
          </span>
          <a className="btn btn-primary btn-sm" href="#prices">
            浏览价格
          </a>
          <button
            type="button"
            className={`nav-toggle${open ? ' is-open' : ''}`}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label="切换导航菜单"
            onClick={() => setOpen((value) => !value)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>

      <div id="mobile-nav" className={`nav-mobile${open ? ' is-open' : ''}`}>
        {LINKS.map((link) => (
          <a key={link.href} href={link.href} onClick={() => setOpen(false)}>
            {link.label}
          </a>
        ))}
      </div>
    </header>
  );
}
