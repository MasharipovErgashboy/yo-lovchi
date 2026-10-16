import { Bus, Map, Headphones } from 'lucide-react';

export default function Header({ activeTab, setActiveTab, isUserLocationActive = false }) {
  const isMap = activeTab === 'xarita';
  const statusClass = isUserLocationActive ? 'active-online' : 'active-offline';

  return (
    <div className={`header-container ${isMap ? 'header-floating-on-map' : ''}`}>
      <button 
        className={`tab-btn ${activeTab === 'marshrutlar' ? `active ${statusClass}` : ''}`}
        onClick={() => setActiveTab('marshrutlar')}
      >
        <Bus size={18} />
        Avtomobillar
      </button>
      <button 
        className={`tab-btn ${activeTab === 'xarita' ? `active ${statusClass}` : ''}`}
        onClick={() => setActiveTab('xarita')}
      >
        <Map size={18} />
        Xarita
      </button>
      <button 
        className={`tab-btn ${activeTab === 'support' ? `active ${statusClass}` : ''}`}
        onClick={() => setActiveTab('support')}
      >
        <Headphones size={18} />
        Yordam
      </button>
    </div>
  );
}
