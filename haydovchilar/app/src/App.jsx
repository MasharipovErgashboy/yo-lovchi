import { useState, useEffect } from 'react'
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
