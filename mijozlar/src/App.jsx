import { useState, useEffect } from 'react'
import './App.css'
import Header from './components/Header'
import RouteList from './components/RouteList'
import Support from './components/Support'

function App() {
  const [activeTab, setActiveTab] = useState('marshrutlar') // 'marshrutlar' | 'xarita' | 'support'

  useEffect(() => {
    if (window.Telegram && window.Telegram.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
      try {
        if (window.Telegram.WebApp.disableVerticalSwipes) {
          window.Telegram.WebApp.disableVerticalSwipes();
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  return (
    <div className="app-container">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="main-content">
        {activeTab === 'marshrutlar' && <RouteList />}
        {activeTab === 'xarita' && (
          <div className="map-placeholder">
            <p>Xarita bu yerda bo'ladi</p>
          </div>
        )}
        {activeTab === 'support' && <Support />}
      </main>
    </div>
  )
}

export default App
