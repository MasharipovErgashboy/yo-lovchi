import { useState, useEffect } from 'react'
import './App.css'
import Header from './components/Header'
import RouteList from './components/RouteList'
import MapComponent from './components/MapComponent'
import Support from './components/Support'

function App() {
  const [activeTab, setActiveTab] = useState('marshrutlar') // 'marshrutlar' | 'xarita' | 'support'
  const [selectedRouteForMap, setSelectedRouteForMap] = useState(null)

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

  const handleSelectRoute = (routeId) => {
    setSelectedRouteForMap(routeId);
    setActiveTab('xarita');
  };

  return (
    <div className="app-container">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="main-content">
        {activeTab === 'marshrutlar' && (
          <RouteList onSelectRoute={handleSelectRoute} />
        )}
        {activeTab === 'xarita' && (
          <MapComponent initialRouteId={selectedRouteForMap} />
        )}
        {activeTab === 'support' && <Support />}
      </main>
    </div>
  )
}

export default App
