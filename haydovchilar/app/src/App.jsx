import { useState, useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import './App.css'
import Header from './components/Header'
import LocationToggle from './components/LocationToggle'
import CapacitySelector from './components/CapacitySelector'
import ActionButtons from './components/ActionButtons'
import BottomNav from './components/BottomNav'
import Messages from './components/Messages'
import Profile from './components/Profile'

function App() {
  const [activeTab, setActiveTab] = useState('joylashuv') // 'joylashuv' | 'xabarlar' | 'profil'
  const [locationEnabled, setLocationEnabled] = useState(false)
  const [capacity, setCapacity] = useState('bosh') // 'bosh' | 'ozroq' | 'tola'
  const [isKickedOut, setIsKickedOut] = useState(false)

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      try {
        tg.ready();
        tg.expand();
        if (tg.disableVerticalSwipes) {
          tg.disableVerticalSwipes();
        }
      } catch (e) {
        console.error("Telegram WebApp init error:", e);
      }
    }
  }, []);

  // Real-time check if driver still exists in system
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const phone = params.get('phone');
    const tgUserId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;

    if (!phone && !tgUserId) return;

    const checkStatus = async () => {
      try {
        let url = 'http://localhost:8000/api/drivers/check?';
        if (phone) url += `phone=${encodeURIComponent(phone)}`;
        else if (tgUserId) url += `telegram_id=${tgUserId}`;

        const res = await fetch(url);
        if (res.status === 404) {
          setIsKickedOut(true);
          setTimeout(() => {
            if (window.Telegram?.WebApp?.close) {
              window.Telegram.WebApp.close();
            }
          }, 2000);
        }
      } catch (e) {
        // Network error, skip
      }
    };

    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  if (isKickedOut) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        padding: '24px',
        textAlign: 'center',
        background: '#0f172a',
        color: '#fff',
        gap: '16px'
      }}>
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: 'rgba(239, 68, 68, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ef4444'
        }}>
          <AlertTriangle size={36} />
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>Tizimdan chiqarildingiz</h2>
        <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: '1.5', margin: 0 }}>
          Sizning haydovchilik hisobingiz administrator tomonidan o'chirildi. Ilova yopilmoqda...
        </p>
      </div>
    );
  }

  return (
    <div className="app-container">
      {activeTab === 'joylashuv' && (
        <div className="tab-content joylashuv-tab">
          <Header />
          <LocationToggle enabled={locationEnabled} setEnabled={setLocationEnabled} />
          <CapacitySelector selected={capacity} onSelect={setCapacity} />
        </div>
      )}
      
      {activeTab === 'xabarlar' && (
        <div className="tab-content" style={{ padding: 0 }}>
          <Messages />
        </div>
      )}

      {activeTab === 'profil' && (
        <div className="tab-content" style={{ padding: 0 }}>
          <Profile />
        </div>
      )}

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  )
}

export default App
