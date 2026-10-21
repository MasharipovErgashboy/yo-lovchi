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

const isInsideTelegram = () => {
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return true;
  }
  const hash = window.location.hash || '';
  const search = window.location.search || '';
  if (
    hash.includes('tgWebAppData') || 
    hash.includes('tgWebAppVersion') || 
    hash.includes('tgWebAppPlatform') ||
    search.includes('tgWebAppData') ||
    search.includes('tgWebAppPlatform')
  ) {
    return true;
  }
  if (typeof window.TelegramWebviewProxy !== 'undefined') return true;
  if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.webAppEvent) return true;
  if (/Telegram/i.test(navigator.userAgent)) return true;
  
  const tg = window.Telegram?.WebApp;
  if (tg) {
    if (tg.initData && tg.initData.length > 0) return true;
    if (tg.platform && tg.platform !== 'unknown') return true;
  }

  // Inside iframe (Telegram Web uses iframe on web.telegram.org)
  if (window.self !== window.top) {
    return true;
  }

  return false;
};

function App() {
  const [inTelegram, setInTelegram] = useState(() => isInsideTelegram());
  const [activeTab, setActiveTab] = useState('marshrutlar') // 'marshrutlar' | 'xarita' | 'support'
  const [selectedRouteForMap, setSelectedRouteForMap] = useState(null)
  const [selectedDirection, setSelectedDirection] = useState('ketmoqda') // 'ketmoqda' | 'kelmoqda'
  const [isUserLocationActive, setIsUserLocationActive] = useState(false)
  const [userLocation, setUserLocation] = useState(null)
  const [userDistanceToRoute, setUserDistanceToRoute] = useState(null)

  useEffect(() => {
    if (inTelegram) {
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
      return;
    }

    // Give Telegram 250ms to inject proxy or initialize if it was loading
    const timer = setTimeout(() => {
      if (isInsideTelegram()) {
        setInTelegram(true);
        if (window.Telegram && window.Telegram.WebApp) {
          window.Telegram.WebApp.ready();
          window.Telegram.WebApp.expand();
        }
      } else {
        // Definitely in a normal browser: redirect to Telegram bot
        window.location.replace("https://t.me/Uz404bot");
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [inTelegram]);

  const handleSelectRoute = (routeId, direction) => {
    setSelectedRouteForMap(routeId);
    if (direction) {
      setSelectedDirection(direction);
    }
    setActiveTab('xarita');
  };

  if (!inTelegram) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '24px',
        textAlign: 'center',
        background: '#0f172a',
        color: '#f8fafc',
        fontFamily: 'sans-serif'
      }}>
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: '#2563eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '20px',
          boxShadow: '0 8px 24px rgba(37, 99, 235, 0.4)'
        }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m22 2-7 20-4-9-9-4Z"/>
            <path d="M22 2 11 13"/>
          </svg>
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>
          Ilovani Telegram orqali oching
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '14px', maxWidth: '300px', lineHeight: '1.5', marginBottom: '24px' }}>
          Ushbu yo'lovchilar mini ilovasi faqat Telegram orqali ishlaydi. Botga yo'naltirilmoqda...
        </p>
        <a 
          href="https://t.me/Uz404bot" 
          style={{
            background: '#2563eb',
            color: 'white',
            padding: '14px 28px',
            borderRadius: '14px',
            textDecoration: 'none',
            fontWeight: '600',
            fontSize: '15px'
          }}
        >
          Telegram Botni Ochish
        </a>
      </div>
    );
  }

  return (
    <div className={`app-container ${activeTab === 'xarita' ? 'map-mode' : ''}`}>
      <Header 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
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
