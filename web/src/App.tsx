import { useState } from 'react';
import type { Category } from './types';
import { useSnapshot } from './lib/useSnapshot';
import { Nav } from './components/Nav';
import { Hero } from './components/Hero';
import { StatsBand } from './components/StatsBand';
import { CategoryShowcase } from './components/CategoryShowcase';
import { Explorer } from './components/Explorer';
import { Charts } from './components/Charts';
import { Method } from './components/Method';
import { ApiCta } from './components/ApiCta';
import { Footer } from './components/Footer';
import './styles.css';

export default function App() {
  const { data, live } = useSnapshot();
  const [category, setCategory] = useState<Category>('gpu-baremetal');

  const selectCategory = (next: Category) => {
    setCategory(next);
    const target = document.getElementById('prices');
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <>
      <a className="skip-link" href="#prices">
        跳到价格数据
      </a>
      <Nav live={live} />
      <main>
        <Hero data={data} />
        <StatsBand data={data} />
        <CategoryShowcase data={data} onSelect={selectCategory} />
        <Explorer data={data} active={category} onChange={setCategory} />
        <Charts data={data} />
        <Method data={data} />
        <ApiCta />
      </main>
      <Footer />
    </>
  );
}
