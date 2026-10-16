import React, { useState, useEffect } from 'react'
import './App.css'
import Header from './components/Header'
import RouteList from './components/RouteList'
import MapComponent from './components/MapComponent'
import Support from './components/Support'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px 20px', textAlign: 'center', color: '#0f172a', fontFamily: 'sans-serif' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>Ilovani yuklashda xatolik yuz berdi</h3>
          <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
            {this.state.error?.message || "Kutilmagan xatolik yuz berdi"}
          </p>
          <button 
            onClick={() => window.location.reload()}
            style={{ background: '#0066FF', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
          >
            Qayta yuklash
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const [activeTab, setActiveTab] = useState('marshrutlar') // 'marshrutlar' | 'xarita' | 'support'
  const [selectedRouteForMap, setSelectedRouteForMap] = useState(null)
  const [selectedDirection, setSelectedDirection] = useState('ketmoqda') // 'ketmoqda' | 'kelmoqda'
  const [isUserLocationActive, setIsUserLocationActive] = useState(false)
  const [userLocation, setUserLocation] = useState(null)
  const [userDistanceToRoute, setUserDistanceToRoute] = useState(null)

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

  const handleSelectRoute = (routeId, direction) => {
    setSelectedRouteForMap(routeId);
    if (direction) {
      setSelectedDirection(direction);
    }
    setActiveTab('xarita');
  };

  return (
    <div className={`app-container ${activeTab === 'xarita' ? 'map-mode' : ''}`}>
      <Header 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isUserLocationActive={isUserLocationActive} 
      />
      
      <ErrorBoundary>
        <main className="main-content">
          {activeTab === 'marshrutlar' && (
            <RouteList 
              onSelectRoute={handleSelectRoute}
              selectedRouteId={selectedRouteForMap}
              setSelectedRouteId={setSelectedRouteForMap}
              selectedDirection={selectedDirection}
              setSelectedDirection={setSelectedDirection}
              isUserLocationActive={isUserLocationActive}
              setIsUserLocationActive={setIsUserLocationActive}
              userLocation={userLocation}
              setUserLocation={setUserLocation}
              userDistanceToRoute={userDistanceToRoute}
              setUserDistanceToRoute={setUserDistanceToRoute}
            />
          )}
          {activeTab === 'xarita' && (
            <MapComponent 
              initialRouteId={selectedRouteForMap} 
              onSelectRouteId={setSelectedRouteForMap}
              selectedDirection={selectedDirection}
              setSelectedDirection={setSelectedDirection}
              userLocation={userLocation}
              isUserLocationActive={isUserLocationActive}
            />
          )}
          {activeTab === 'support' && <Support />}
        </main>
      </ErrorBoundary>
    </div>
  )
}

export default App
