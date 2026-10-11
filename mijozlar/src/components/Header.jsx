import { Bus, Map, Headphones } from 'lucide-react';

export default function Header({ activeTab, setActiveTab }) {
  return (
    <div className="header-container">
      <button 
        className={`tab-btn ${activeTab === 'marshrutlar' ? 'active' : ''}`}
        onClick={() => setActiveTab('marshrutlar')}
      >
        <Bus size={18} />
        Marshrutlar
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
