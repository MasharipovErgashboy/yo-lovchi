import { useState, useEffect } from 'react'
import { AlertTriangle, Navigation, MapPin } from 'lucide-react'
import './App.css'
import Header from './components/Header'
import LocationToggle from './components/LocationToggle'
import CapacitySelector from './components/CapacitySelector'
import BottomNav from './components/BottomNav'
import Messages from './components/Messages'
import Profile from './components/Profile'
import DriverMap from './components/DriverMap'

function App() {
  const [activeTab, setActiveTab] = useState('joylashuv') // 'joylashuv' | 'xabarlar' | 'profil'
  const [subTab, setSubTab] = useState('joylashuv') // 'joylashuv' | 'xarita'
  const [navToStartActive, setNavToStartActive] = useState(false)
  const [locationEnabled, setLocationEnabled] = useState(false)
  const [capacity, setCapacity] = useState('bosh') // 'bosh' | 'ozroq' | 'tola'
  const [isKickedOut, setIsKickedOut] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [assignedRoute, setAssignedRoute] = useState(null)
  const [driverLocation, setDriverLocation] = useState(null)

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      try {
        tg.ready();
        tg.expand();
        if (tg.isVersionAtLeast && tg.isVersionAtLeast('8.0') && typeof tg.requestFullscreen === 'function') {
          try { tg.requestFullscreen(); } catch (e) {}
        }
        if (typeof tg.disableVerticalSwipes === 'function') {
          try { tg.disableVerticalSwipes(); } catch (e) {}
        }
        if (typeof tg.setHeaderColor === 'function') {
          try { tg.setHeaderColor('#F0F4F8'); } catch (e) {}
        }
        if (typeof tg.setBackgroundColor === 'function') {
          try { tg.setBackgroundColor('#F0F4F8'); } catch (e) {}
        }
      } catch (e) {
        console.error("Telegram WebApp init error:", e);
      }

      const updateInsets = () => {
        try {
          const contentTop = tg.contentSafeAreaInset?.top || 0;
          const safeTop = tg.safeAreaInset?.top || 0;
          const top = Math.max(contentTop, safeTop + 54, 64);
          document.documentElement.style.setProperty('--app-top-inset', `${top}px`);
        } catch(e) {}
      };
      updateInsets();

      if (typeof tg.onEvent === 'function') {
        tg.onEvent('contentSafeAreaChanged', updateInsets);
        tg.onEvent('safeAreaChanged', updateInsets);
        tg.onEvent('fullscreenChanged', updateInsets);
      }

      const enterFs = () => {
        try {
          if (tg.isVersionAtLeast && tg.isVersionAtLeast('8.0') && typeof tg.requestFullscreen === 'function' && !tg.isFullscreen) {
            tg.requestFullscreen();
            updateInsets();
          }
        } catch (e) {}
      };
      window.addEventListener('touchstart', enterFs, { once: true, passive: true });
      window.addEventListener('click', enterFs, { once: true, passive: true });
    }
  }, []);

  // Real-time check if driver still exists in system & fetch assigned route
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const phone = params.get('phone');
    const tgUserId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;

    if (!phone && !tgUserId) return;

    const checkStatus = async () => {
      try {
        let url = '/api/drivers/check?';
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
        } else if (res.ok) {
          const data = await res.json();
          if (data && data.assigned_route) {
            setAssignedRoute(prev => {
              if (!prev) return data.assigned_route;
              if (prev.id !== data.assigned_route.id || prev.updated_at !== data.assigned_route.updated_at) {
                return data.assigned_route;
              }
              return prev;
            });
          }
        }
      } catch (e) {
        // Network error, skip
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  // Real-time check for unread messages badge on bottom nav
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const phone = params.get('phone');
    const tgUserId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;

    if (!phone && !tgUserId) return;

    const checkUnread = async () => {
      try {
        const q = new URLSearchParams();
        if (phone) q.set('phone', phone);
        if (tgUserId) q.set('telegram_id', tgUserId);
        const res = await fetch(`/api/driver-messages?${q.toString()}`);
        if (res.ok) {
          const list = await res.json();
          const unread = (list || []).filter(m => !m.is_read).length;
          setUnreadCount(prev => (prev !== unread ? unread : prev));
        }
      } catch (e) {}
    };

    checkUnread();
    const interval = setInterval(checkUnread, 5000);
    return () => clearInterval(interval);
  }, []);

  // Instant Capacity Update Handler
  const handleCapacityChange = (newCapacity) => {
    setCapacity(newCapacity);

    const params = new URLSearchParams(window.location.search);
    const phone = params.get('phone');
    const tgUserId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;

    fetch('/api/driver/capacity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        telegram_id: tgUserId || null,
        phone: phone || null,
        capacity: newCapacity
      })
    }).catch(err => console.error("Capacity change error:", err));
  };

  // Location Toggle Handler (with immediate online/offline GPS signal)
  const handleLocationToggle = (newEnabled, currentPos = null) => {
    setLocationEnabled(newEnabled);

    const params = new URLSearchParams(window.location.search);
    const phone = params.get('phone');
    const tgUserId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;

    if (!newEnabled) {
      // Driver turned off location -> notify backend immediately
      fetch('/api/driver/offline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegram_id: tgUserId || null,
          phone: phone || null
        })
      }).catch(err => console.error("Offline error:", err));
    } else {
      // Driver turned on location -> notify backend immediately with current GPS
      const lat = currentPos?.coords?.latitude || driverLocation?.latitude;
      const lng = currentPos?.coords?.longitude || driverLocation?.longitude;
      if (lat && lng && (phone || tgUserId)) {
        fetch('/api/driver/location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            telegram_id: tgUserId || null,
            phone: phone || null,
            route_id: assignedRoute?.id || null,
            latitude: lat,
            longitude: lng,
            heading: currentPos?.coords?.heading || driverLocation?.heading || 0.0,
            speed: currentPos?.coords?.speed ? Math.round(currentPos.coords.speed * 3.6) : (driverLocation?.speed || 0.0),
            capacity: capacity
          })
        }).catch(err => console.error("Immediate GPS send error:", err));
      }
    }
  };

  // Real-time GPS location transmitter
  useEffect(() => {
    if (!locationEnabled && subTab !== 'xarita' && !navToStartActive) return;

    const params = new URLSearchParams(window.location.search);
    const phone = params.get('phone');
    const tgUserId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;

    const sendPosition = (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      const heading = position.coords.heading || 0.0;
      const speed = position.coords.speed ? Math.round(position.coords.speed * 3.6) : 0.0;

      // Update local state for driver map (only if actually moved to prevent render loop)
      setDriverLocation(prev => {
        if (prev && Math.abs(prev.latitude - lat) < 0.00001 && Math.abs(prev.longitude - lng) < 0.00001 && prev.heading === heading) {
          return prev;
        }
        return { latitude: lat, longitude: lng, heading, speed };
      });

      // Transmit to backend API ONLY when driver has officially enabled location
      if (locationEnabled && (phone || tgUserId)) {
        const payload = {
          telegram_id: tgUserId || null,
          phone: phone || null,
          route_id: assignedRoute?.id || null,
          latitude: lat,
          longitude: lng,
          heading: heading,
          speed: speed,
          capacity: capacity
        };

        fetch('/api/driver/location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).catch(err => console.error("GPS send error:", err));
      }
    };

    let watchId = null;
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(sendPosition, (err) => console.warn(err), { enableHighAccuracy: true });
      watchId = navigator.geolocation.watchPosition(
        sendPosition,
        (err) => console.warn("Watch position error:", err),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 2000 }
      );
    }

    const interval = setInterval(() => {
      if ("geolocation" in navigator && locationEnabled) {
        navigator.geolocation.getCurrentPosition(sendPosition, (err) => console.warn(err), { enableHighAccuracy: true });
      }
    }, 2000);

    return () => {
      if (watchId !== null && "geolocation" in navigator) {
        navigator.geolocation.clearWatch(watchId);
      }
      clearInterval(interval);
    };
  }, [locationEnabled, capacity, assignedRoute, subTab, navToStartActive]);

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

  // Navigate to start stop (triggered when user clicks "Ketdik" in distance modal)
  const handleNavigateToStart = (coords) => {
    if (coords && coords.lat && coords.lng) {
      setDriverLocation(prev => ({
        ...(prev || {}),
        latitude: coords.lat,
        longitude: coords.lng
      }));
    } else if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setDriverLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            heading: pos.coords.heading || 0,
            speed: pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 0
          });
        },
        () => {},
        { enableHighAccuracy: true }
      );
    }
    setNavToStartActive(true);
    setSubTab('xarita');
  };

  return (
    <div className="app-container">
      {activeTab === 'joylashuv' && (
        <div className={`tab-content joylashuv-tab ${subTab === 'xarita' ? 'is-map-view' : ''}`}>
          <Header assignedRoute={assignedRoute} />
          
          {/* Subtabs Switcher: Joylashuv vs Xarita */}
          <div className="driver-subtabs-bar">
            <button
              type="button"
              className={`driver-subtab-pill ${subTab === 'joylashuv' ? 'active' : ''}`}
              onClick={() => setSubTab('joylashuv')}
            >
              <Navigation size={15} style={{ transform: 'rotate(45deg)' }} />
              <span>Joylashuv</span>
            </button>
            <button
              type="button"
              className={`driver-subtab-pill ${subTab === 'xarita' ? 'active' : ''}`}
              onClick={() => setSubTab('xarita')}
            >
              <MapPin size={15} />
              <span>Xarita</span>
            </button>
          </div>

          {subTab === 'joylashuv' ? (
            <>
              {/* Location Toggle Button with 1km distance check */}
              <LocationToggle 
                enabled={locationEnabled} 
                setEnabled={handleLocationToggle} 
                assignedRoute={assignedRoute}
                onNavigateToStart={handleNavigateToStart}
                onLocationUpdate={(pos) => {
                  setDriverLocation({
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                    heading: pos.coords.heading || 0,
                    speed: pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 0
                  });
                }}
              />

              {/* Instant Capacity Selector */}
              <CapacitySelector selected={capacity} onSelect={handleCapacityChange} />
            </>
          ) : (
            /* Full Real Leaflet Map showing assigned route and ONLY the driver's own vehicle */
            <DriverMap 
              assignedRoute={assignedRoute} 
              driverLocation={driverLocation} 
              locationEnabled={locationEnabled}
              navToStartActive={navToStartActive}
              onClearNavToStart={() => setNavToStartActive(false)}
            />
          )}
        </div>
      )}
      
      {activeTab === 'xabarlar' && (
        <div className="tab-content" style={{ padding: 0 }}>
          <Messages onUnreadChange={setUnreadCount} />
        </div>
      )}

      {activeTab === 'profil' && (
        <div className="tab-content" style={{ padding: 0 }}>
          <Profile />
        </div>
      )}

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} unreadCount={unreadCount} />
    </div>
  )
}

export default App
