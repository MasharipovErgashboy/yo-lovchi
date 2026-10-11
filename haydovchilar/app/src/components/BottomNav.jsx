import { MapPin, MessageCircle, User } from 'lucide-react'

export default function BottomNav({ activeTab, setActiveTab }) {
  return (
    <div className="bottom-nav">
      <button 
        className={`nav-item ${activeTab === 'joylashuv' ? 'active' : ''}`}
        onClick={() => setActiveTab('joylashuv')}
      >
        <div className="nav-item-bg">
          <MapPin size={24} color={activeTab === 'joylashuv' ? 'var(--blue-primary)' : 'var(--text-secondary)'} strokeWidth={activeTab === 'joylashuv' ? 2.5 : 2} />
        </div>
        <span className="nav-text" style={{ color: activeTab === 'joylashuv' ? 'var(--blue-primary)' : 'var(--text-secondary)' }}>Joylashuv</span>
      </button>

      <button 
        className={`nav-item ${activeTab === 'xabarlar' ? 'active' : ''}`}
        onClick={() => setActiveTab('xabarlar')}
      >
        <div className="nav-item-bg" style={{ position: 'relative' }}>
          <MessageCircle size={24} color={activeTab === 'xabarlar' ? 'var(--blue-primary)' : 'var(--text-secondary)'} strokeWidth={activeTab === 'xabarlar' ? 2.5 : 2} />
          <div className="nav-badge-dot"></div>
        </div>
        <span className="nav-text" style={{ color: activeTab === 'xabarlar' ? 'var(--blue-primary)' : 'var(--text-secondary)' }}>Xabarlar</span>
      </button>

      <button 
        className={`nav-item ${activeTab === 'profil' ? 'active' : ''}`}
        onClick={() => setActiveTab('profil')}
      >
        <div className="nav-item-bg">
          <User size={24} color={activeTab === 'profil' ? 'var(--blue-primary)' : 'var(--text-secondary)'} strokeWidth={activeTab === 'profil' ? 2.5 : 2} />
        </div>
        <span className="nav-text" style={{ color: activeTab === 'profil' ? 'var(--blue-primary)' : 'var(--text-secondary)' }}>Profil</span>
      </button>
    </div>
  )
}
