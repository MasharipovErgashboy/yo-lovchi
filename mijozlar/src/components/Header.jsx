import { Bus, Map, Headphones } from 'lucide-react';

export default function Header({ activeTab, setActiveTab }) {
  const isMap = activeTab === 'xarita';

  return (
    <div className={`header-container ${isMap ? 'header-floating-on-map' : ''}`}>
      <button 
        className={`tab-btn ${activeTab === 'marshrutlar' ? 'active' : ''}`}
        onClick={() => setActiveTab('marshrutlar')}
      >
        <Bus size={18} />
        Avtomobillar
      </button>
      <button 
        className={`tab-btn ${activeTab === 'xarita' ? 'active' : ''}`}
        onClick={() => setActiveTab('xarita')}
      >
        <Map size={18} />
        Xarita
      </button>
      <button 
        className={`tab-btn ${activeTab === 'support' ? 'active' : ''}`}
        onClick={() => setActiveTab('support')}
      >
        <Headphones size={18} />
        Yordam
      </button>
    </div>
  );
}
