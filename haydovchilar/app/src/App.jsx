import { useState, useEffect, useRef } from 'react'
import { AlertTriangle, Navigation, MapPin, X, Volume2 } from 'lucide-react'
import './App.css'
import Header from './components/Header'
import LocationToggle from './components/LocationToggle'
import BottomNav from './components/BottomNav'
import Messages from './components/Messages'
import Profile from './components/Profile'
import DriverMap from './components/DriverMap'

const safeGetStorage = (key) => {
  try { return localStorage.getItem(key); } catch (e) { return null; }
};
const safeSetStorage = (key, val) => {
  try { localStorage.setItem(key, val); } catch (e) {}
};

function getStopDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) *
    Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

const isInsideDriverTelegram = () => {
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
  if (window.self !== window.top) return true;

  return false;
};

function App() {
  const [inTelegram, setInTelegram] = useState(() => isInsideDriverTelegram());
  const [activeTab, setActiveTab] = useState('joylashuv') // 'joylashuv' | 'xabarlar' | 'profil'
  const [subTab, setSubTab] = useState('joylashuv') // 'joylashuv' | 'xarita'
  const [navToStartActive, setNavToStartActive] = useState(false)
  const [locationEnabled, setLocationEnabled] = useState(() => safeGetStorage('yolovchi_location_enabled') === 'true')
  const [capacity, setCapacity] = useState('bosh') // 'bosh' | 'ozroq' | 'tola'
  const [isKickedOut, setIsKickedOut] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [assignedRoute, setAssignedRoute] = useState(null)
  const [driverLocation, setDriverLocation] = useState(null)
  const [deviationAlert, setDeviationAlert] = useState(null)
  const [routeWarning, setRouteWarning] = useState(null)
  const [playingStopAnnouncement, setPlayingStopAnnouncement] = useState(null)
  const playedStopsRef = useRef(new Set())
  const currentAudioRef = useRef(null)
  const assignedRouteRef = useRef(assignedRoute)
  assignedRouteRef.current = assignedRoute

  useEffect(() => {
    if (inTelegram) return;

    // Check again after 250ms in case webview proxy or parameters are delayed
    const timer = setTimeout(() => {
      if (isInsideDriverTelegram()) {
        setInTelegram(true);
      } else {
        window.location.replace("https://t.me/Car404bot");
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [inTelegram]);

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
          Ushbu haydovchilar mini ilovasi faqat Telegram orqali ishlaydi. Botga yo'naltirilmoqda...
        </p>
        <a 
          href="https://t.me/Car404bot" 
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
        if (tg.LocationManager && typeof tg.LocationManager.init === 'function') {
          try { tg.LocationManager.init(); } catch (e) {}
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
    const urlDriverId = params.get('driver_id');
    const urlPhone = params.get('phone');
    const urlTgId = params.get('telegram_id');

    // Overwrite storage immediately if fresh params arrive in URL
    if (urlDriverId) safeSetStorage('yolovchi_driver_id', urlDriverId);
    if (urlPhone) safeSetStorage('yolovchi_driver_phone', urlPhone);
    if (urlTgId) safeSetStorage('yolovchi_driver_tg_id', urlTgId);

    const checkStatus = async () => {
      try {
        const currentParams = new URLSearchParams(window.location.search);
        const driverId = currentParams.get('driver_id') || safeGetStorage('yolovchi_driver_id');
        const phone = currentParams.get('phone') || safeGetStorage('yolovchi_driver_phone');
        const tgUserId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id || currentParams.get('telegram_id') || safeGetStorage('yolovchi_driver_tg_id');

        if (!phone && !tgUserId && !driverId) return;

        const q = new URLSearchParams();
        if (driverId) q.set('driver_id', driverId);
        if (phone) q.set('phone', phone);
        if (tgUserId) q.set('telegram_id', tgUserId);

        const res = await fetch(`/api/drivers/check?${q.toString()}`);
        if (res.status === 404) {
          // Clear cached local storage to prevent future stale ID mismatches
          try {
            localStorage.removeItem('yolovchi_driver_id');
            localStorage.removeItem('yolovchi_driver_phone');
            localStorage.removeItem('yolovchi_driver_tg_id');
          } catch (e) {}

          setIsKickedOut(true);
          setTimeout(() => {
            if (window.Telegram?.WebApp?.close) {
              window.Telegram.WebApp.close();
            }
          }, 2000);
        } else if (res.ok) {
          setIsKickedOut(false);
          const data = await res.json();
          if (data && data.driver) {
            if (data.driver.id) safeSetStorage('yolovchi_driver_id', data.driver.id);
            if (data.driver.phone) safeSetStorage('yolovchi_driver_phone', data.driver.phone);
            if (data.driver.telegram_id) safeSetStorage('yolovchi_driver_tg_id', data.driver.telegram_id);
          }

          const hasAssignedRoute = Boolean(data && data.assigned_route && data.assigned_route.id);

          if (hasAssignedRoute) {
            setAssignedRoute(prev => {
              if (!prev) return data.assigned_route;
              if (
                prev.id !== data.assigned_route.id ||
                prev.updated_at !== data.assigned_route.updated_at ||
                prev.is_active !== data.assigned_route.is_active
              ) {
                return data.assigned_route;
              }
              return prev;
            });

            // If assigned route is inactive/locked, driver must be offline
            if (data.assigned_route && data.assigned_route.is_active === false) {
              setLocationEnabled(false);
              isOnlineRef.current = false;
              safeSetStorage('yolovchi_location_enabled', 'false');
            } else if (data.driver && data.driver.is_online) {
              // Sync online state with database (only valid if assigned route exists and is active)
              setLocationEnabled(true);
              isOnlineRef.current = true;
              safeSetStorage('yolovchi_location_enabled', 'true');
            } else {
              setLocationEnabled(false);
              isOnlineRef.current = false;
              safeSetStorage('yolovchi_location_enabled', 'false');
            }
          } else {
            // Unassigned driver: MUST be offline and button disabled in grey
            setAssignedRoute(null);
            setLocationEnabled(false);
            isOnlineRef.current = false;
            safeSetStorage('yolovchi_location_enabled', 'false');
          }
        }
      } catch (e) {
        // Network error, skip
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 2000);
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

  const isOnlineRef = useRef(safeGetStorage('yolovchi_location_enabled') === 'true');
  const watchIdRef = useRef(null);
  const prevCoordsRef = useRef(null);
  const lastHeadingRef = useRef(0.0);
  const capacityRef = useRef(capacity);
  capacityRef.current = capacity;
  const wakeLockRef = useRef(null);
  const isGpsBusyRef = useRef(false);
  const isSendingRef = useRef(false);
  const lastSentTimeRef = useRef(0);
  const lastGpsFixTimeRef = useRef(Date.now());
  const silentLoopAudioRef = useRef(null);

  // Helper to get reliable driver identity from URL params or localStorage
  const getDriverIdentity = () => {
    const params = new URLSearchParams(window.location.search);
    const driverId = params.get('driver_id') || safeGetStorage('yolovchi_driver_id');
    const phone = params.get('phone') || safeGetStorage('yolovchi_driver_phone');
    const tgUserId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id || params.get('telegram_id') || safeGetStorage('yolovchi_driver_tg_id');
    return {
      driver_id: driverId ? parseInt(driverId) : null,
      phone: phone || null,
      telegram_id: tgUserId ? parseInt(tgUserId) : null
    };
  };

  // Play Stop Announcement helper (Har bir bekatga yetib kelganda 1 marta ijro etiladi)
  const playStopAnnouncement = (stop) => {
    try {
      if (currentAudioRef.current) {
        try { currentAudioRef.current.pause(); } catch (e) {}
        currentAudioRef.current = null;
      }

      let audioUrl = stop.audio_url;
      if (!audioUrl) return;

      if (!audioUrl.startsWith('http')) {
        if (window.location.hostname.includes('yolovchiapp.uz')) {
          audioUrl = `https://api.yolovchiapp.uz${audioUrl}`;
        } else {
          audioUrl = `${window.location.origin}${audioUrl}`;
        }
      }

      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;

      const stopDisplayName = stop.name || `${stop.order}-bekat`;
      setPlayingStopAnnouncement({
        name: stopDisplayName,
        order: stop.order
      });

      audio.play().catch((err) => {
        console.warn("Audio autoplay blocked or failed:", err);
      });

      audio.onended = () => {
        setPlayingStopAnnouncement(null);
        if (currentAudioRef.current === audio) {
          currentAudioRef.current = null;
        }
      };

      audio.onerror = () => {
        setPlayingStopAnnouncement(null);
        if (currentAudioRef.current === audio) {
          currentAudioRef.current = null;
        }
      };
    } catch (e) {
      console.error("Audio playback error:", e);
    }
  };

  const handleStopAnnouncement = () => {
    if (currentAudioRef.current) {
      try { currentAudioRef.current.pause(); } catch (e) {}
      currentAudioRef.current = null;
    }
    setPlayingStopAnnouncement(null);
  };

  // Location Toggle Handler (with immediate online/offline GPS signal)
  const handleLocationToggle = (newEnabled, currentPos = null) => {
    if (newEnabled && (!assignedRoute || assignedRoute.is_active === false)) {
      isOnlineRef.current = false;
      setLocationEnabled(false);
      safeSetStorage('yolovchi_location_enabled', 'false');
      if (assignedRoute && assignedRoute.is_active === false) {
        if (window.Telegram?.WebApp?.showAlert) {
          window.Telegram.WebApp.showAlert("Sizning marshrutingiz active emas");
        } else {
          alert("Sizning marshrutingiz active emas");
        }
      }
      return;
    }

    isOnlineRef.current = newEnabled;
    setLocationEnabled(newEnabled);
    safeSetStorage('yolovchi_location_enabled', newEnabled ? 'true' : 'false');

    const identity = getDriverIdentity();

    if (!newEnabled) {
      // Driver turned off location -> stop audio and clear announcements
      if (currentAudioRef.current) {
        try { currentAudioRef.current.pause(); } catch (e) {}
        currentAudioRef.current = null;
      }
      if (silentLoopAudioRef.current) {
        try { silentLoopAudioRef.current.pause(); } catch (e) {}
      }
      setPlayingStopAnnouncement(null);
      playedStopsRef.current.clear();

      if (watchIdRef.current !== null && "geolocation" in navigator) {
        try { navigator.geolocation.clearWatch(watchIdRef.current); } catch (e) {}
        watchIdRef.current = null;
      }

      if (wakeLockRef.current) {
        try { wakeLockRef.current.release(); } catch (e) {}
        wakeLockRef.current = null;
      }

      fetch('/api/driver/offline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(identity)
      }).catch(err => console.error("Offline error:", err));
    } else {
      // Driver turned on location -> unlock audio context on user gesture & keep thread awake
      try {
        if (!silentLoopAudioRef.current) {
          silentLoopAudioRef.current = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA');
          silentLoopAudioRef.current.loop = true;
          silentLoopAudioRef.current.volume = 0.01;
        }
        silentLoopAudioRef.current.play().catch(() => {});
      } catch (e) {}

      // Keep screen ON while driver is actively working
      if ('wakeLock' in navigator) {
        navigator.wakeLock.request('screen').then(wl => {
          wakeLockRef.current = wl;
        }).catch(() => {});
      }

      // Driver turned on location -> notify backend immediately with current GPS
      const lat = currentPos?.coords?.latitude || driverLocation?.latitude;
      const lng = currentPos?.coords?.longitude || driverLocation?.longitude;
      if (lat && lng && (identity.driver_id || identity.phone || identity.telegram_id)) {
        isSendingRef.current = true;
        lastSentTimeRef.current = Date.now();
        lastGpsFixTimeRef.current = Date.now();

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        fetch('/api/driver/location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            ...identity,
            route_id: assignedRoute?.id || null,
            latitude: lat,
            longitude: lng,
            heading: currentPos?.coords?.heading || driverLocation?.heading || 0.0,
            speed: currentPos?.coords?.speed ? Math.round(currentPos.coords.speed * 3.6) : (driverLocation?.speed || 0.0),
            capacity: capacityRef.current || 'bosh'
          })
        })
        .then(res => res.json())
        .then(data => {
          clearTimeout(timeoutId);
          if (data && data.inactive_route) {
            handleLocationToggle(false);
            if (window.Telegram?.WebApp?.showAlert) {
              window.Telegram.WebApp.showAlert(data.message || "Sizning marshrutingiz active emas");
            } else {
              alert(data.message || "Sizning marshrutingiz active emas");
            }
          } else if (data && data.deviated) {
            handleLocationToggle(false);
            setDeviationAlert(data.message || "Siz belgilangan marshrut chizig'idan uzoqlashdingiz. Marshrut chizig'iga qayting va ilovada Joylashuvingizni yoqing.");
            setUnreadCount(prev => prev + 1);
          } else if (data && data.out_of_route) {
            handleLocationToggle(false);
            setRouteWarning(data.message || "Joylashuvni yoqish uchun avval marshrut boshlanish nuqtasiga yoki marshrut chizig'iga yaqinlashing.");
          }
        })
        .catch(err => {
          clearTimeout(timeoutId);
          console.error("Immediate GPS send error:", err);
        })
        .finally(() => {
          isSendingRef.current = false;
        });
      }
    }
  };

  // Real-time continuous GPS location transmitter
  useEffect(() => {
    if (!locationEnabled && subTab !== 'xarita' && !navToStartActive) return;

    const calculateMovementBearing = (lat1, lon1, lat2, lon2) => {
      const toRad = Math.PI / 180;
      const toDeg = 180 / Math.PI;
      const dLon = (lon2 - lon1) * toRad;
      const y = Math.sin(dLon) * Math.cos(lat2 * toRad);
      const x = Math.cos(lat1 * toRad) * Math.sin(lat2 * toRad) -
                Math.sin(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.cos(dLon);
      let brng = Math.atan2(y, x) * toDeg;
      return (brng + 360) % 360;
    };

    const sendPosition = (position) => {
      if (!isOnlineRef.current && subTab !== 'xarita' && !navToStartActive) return;
      if (!position || !position.coords) return;

      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      if (!lat || !lng || isNaN(lat) || isNaN(lng)) return;

      lastGpsFixTimeRef.current = Date.now();

      const rawHeading = position.coords.heading;
      const rawSpeed = position.coords.speed;
      const speed = rawSpeed !== null && rawSpeed !== undefined && !isNaN(rawSpeed) ? Math.max(0, Math.round(rawSpeed * 3.6)) : 0.0;

      // Dynamic movement-based heading calculation
      let effectiveHeading = lastHeadingRef.current || 0.0;
      if (rawHeading !== null && rawHeading !== undefined && !isNaN(rawHeading) && Number(rawHeading) > 0) {
        effectiveHeading = Math.round(Number(rawHeading));
        lastHeadingRef.current = effectiveHeading;
      } else if (prevCoordsRef.current) {
        const d = getStopDistanceMeters(prevCoordsRef.current.lat, prevCoordsRef.current.lng, lat, lng);
        if (d >= 2) {
          effectiveHeading = Math.round(calculateMovementBearing(prevCoordsRef.current.lat, prevCoordsRef.current.lng, lat, lng));
          lastHeadingRef.current = effectiveHeading;
          prevCoordsRef.current = { lat, lng };
        }
      } else {
        prevCoordsRef.current = { lat, lng };
      }

      // Update local state for driver map (always fresh, zero lag)
      setDriverLocation({ latitude: lat, longitude: lng, heading: effectiveHeading, speed });

      // Transmit to backend API ONLY when driver is strictly online
      if (isOnlineRef.current) {
        // --- REAL-TIME STOP MP3 ANNOUNCEMENT ---
        const currentRoute = assignedRouteRef.current || assignedRoute;
        if (currentRoute && Array.isArray(currentRoute.stops) && currentRoute.stops.length > 0) {
          currentRoute.stops.forEach((stop) => {
            if (!stop || !stop.audio_url || typeof stop.lat !== 'number' || typeof stop.lng !== 'number') {
              return;
            }
            const dist = getStopDistanceMeters(lat, lng, stop.lat, stop.lng);
            const stopKey = stop.id || stop.order || `${stop.name}_${stop.lat}_${stop.lng}`;

            // Driver arrived at stop (within 80 meters)
            if (dist <= 80) {
              if (!playedStopsRef.current.has(stopKey)) {
                playedStopsRef.current.add(stopKey);
                playStopAnnouncement(stop);
              }
            } else if (dist > 250) {
              // Reset when moving away so it plays again on the next round/trip
              if (playedStopsRef.current.has(stopKey)) {
                playedStopsRef.current.delete(stopKey);
              }
            }
          });
        }

        const now = Date.now();
        // Prevent overlapping HTTP POST requests
        if (isSendingRef.current && (now - lastSentTimeRef.current) < 1200) {
          return;
        }

        const identity = getDriverIdentity();
        if (identity.driver_id || identity.phone || identity.telegram_id) {
          isSendingRef.current = true;
          lastSentTimeRef.current = now;

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 6000);

          fetch('/api/driver/location', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
              ...identity,
              route_id: assignedRouteRef.current?.id || assignedRoute?.id || null,
              latitude: lat,
              longitude: lng,
              heading: effectiveHeading,
              speed: speed,
              capacity: capacityRef.current || 'bosh'
            })
          })
          .then(res => res.json())
          .then(data => {
            clearTimeout(timeoutId);
            if (data && data.inactive_route) {
              handleLocationToggle(false);
              if (window.Telegram?.WebApp?.showAlert) {
                window.Telegram.WebApp.showAlert(data.message || "Sizning marshrutingiz active emas");
              } else {
                alert(data.message || "Sizning marshrutingiz active emas");
              }
            } else if (data && data.deviated) {
              handleLocationToggle(false);
              setDeviationAlert(data.message || "Siz belgilangan marshrut chizig'idan uzoqlashdingiz. Marshrut chizig'iga qayting va ilovada Joylashuvingizni yoqing.");
              setUnreadCount(prev => prev + 1);
            } else if (data && data.out_of_route) {
              handleLocationToggle(false);
              setRouteWarning(data.message || "Joylashuvni yoqish uchun avval marshrut boshlanish nuqtasiga yoki marshrut chizig'iga yaqinlashing.");
            }
          })
          .catch(err => {
            clearTimeout(timeoutId);
            console.error("GPS send error:", err);
          })
          .finally(() => {
            isSendingRef.current = false;
          });
        }
      }
    };

    // Multi-strategy location requester (Telegram LocationManager + HTML5 Geolocation with safety timer)
    const requestFreshLocation = () => {
      const tg = window.Telegram?.WebApp;
      const lm = tg?.LocationManager;

      // 1. Telegram native LocationManager (direct native bridge)
      if (lm && typeof lm.getLocation === 'function' && lm.isLocationAvailable) {
        try {
          lm.getLocation((pos) => {
            if (pos && typeof pos.latitude === 'number' && typeof pos.longitude === 'number') {
              sendPosition({
                coords: {
                  latitude: pos.latitude,
                  longitude: pos.longitude,
                  heading: pos.course || 0,
                  speed: pos.speed || 0,
                  accuracy: pos.accuracy || 10
                }
              });
            }
          });
        } catch (e) {
          console.warn("Telegram LocationManager getLocation notice:", e);
        }
      }

      // 2. HTML5 Geolocation with non-blocking safety timer
      if ("geolocation" in navigator && !isGpsBusyRef.current) {
        isGpsBusyRef.current = true;
        const safetyTimer = setTimeout(() => {
          isGpsBusyRef.current = false;
        }, 4000);

        navigator.geolocation.getCurrentPosition(
          (pos) => {
            clearTimeout(safetyTimer);
            isGpsBusyRef.current = false;
            sendPosition(pos);
          },
          () => {
            // High-accuracy failed/timed out, try fallback with cached or low accuracy
            navigator.geolocation.getCurrentPosition(
              (fallbackPos) => {
                clearTimeout(safetyTimer);
                isGpsBusyRef.current = false;
                sendPosition(fallbackPos);
              },
              () => {
                clearTimeout(safetyTimer);
                isGpsBusyRef.current = false;
              },
              { enableHighAccuracy: false, timeout: 3500, maximumAge: 5000 }
            );
          },
          { enableHighAccuracy: true, timeout: 4000, maximumAge: 2000 }
        );
      }
    };

    // Continuous Watcher Starter (Auto-restartable)
    const startWatcher = () => {
      if (watchIdRef.current !== null && "geolocation" in navigator) {
        try { navigator.geolocation.clearWatch(watchIdRef.current); } catch (e) {}
        watchIdRef.current = null;
      }

      if ("geolocation" in navigator) {
        watchIdRef.current = navigator.geolocation.watchPosition(
          sendPosition,
          (err) => console.warn("Watch position notice:", err),
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 2000 }
        );
      }
    };

    // 1. Initial Position check & Start continuous watcher
    requestFreshLocation();
    startWatcher();

    // 2. Watchdog Heartbeat (Every 2.5 seconds): Self-healing & Active Push
    const watchdogInterval = setInterval(() => {
      if (isOnlineRef.current) {
        const now = Date.now();
        const silentGpsElapsed = now - lastGpsFixTimeRef.current;

        // Auto-heal: If watchPosition went silent for > 7s on Android, restart it
        if (silentGpsElapsed > 7000) {
          startWatcher();
        }

        // Active poll: ensure position is transmitted every 2-3 seconds while driving
        const elapsedSinceSend = now - lastSentTimeRef.current;
        if (elapsedSinceSend > 2200) {
          requestFreshLocation();
        }
      }
    }, 2500);

    // 3. Screen Wake Lock Management
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator && !wakeLockRef.current && isOnlineRef.current) {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
          wakeLockRef.current.addEventListener('release', () => {
            wakeLockRef.current = null;
          });
        }
      } catch (e) {}
    };
    if (isOnlineRef.current) {
      requestWakeLock();
    }

    // 4. Visibility Change (Phone unlocked or browser returned to foreground)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && isOnlineRef.current) {
        requestWakeLock();
        startWatcher();
        requestFreshLocation();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (watchIdRef.current !== null && "geolocation" in navigator) {
        try { navigator.geolocation.clearWatch(watchIdRef.current); } catch (e) {}
        watchIdRef.current = null;
      }
      clearInterval(watchdogInterval);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (wakeLockRef.current) {
        try { wakeLockRef.current.release(); } catch (e) {}
        wakeLockRef.current = null;
      }
    };
  }, [locationEnabled, subTab, navToStartActive]);

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
          <Header 
            assignedRoute={assignedRoute} 
            playingStopAnnouncement={playingStopAnnouncement}
            onStopAnnouncement={handleStopAnnouncement}
          />
          
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
          <Profile assignedRoute={assignedRoute} />
        </div>
      )}

      {/* 1 KM Deviation Alert Modal */}
      {deviationAlert && (
        <div className="driver-modal-overlay" onClick={() => setDeviationAlert(null)}>
          <div className="driver-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="driver-modal-close" onClick={() => setDeviationAlert(null)}>
              <X size={20} />
            </button>
            <div className="driver-modal-icon-wrap warning">
              <AlertTriangle size={36} color="#ef4444" />
            </div>
            <h3 className="driver-modal-title">Marshrutdan chetlanish!</h3>
            <p className="driver-modal-desc">
              {deviationAlert}
            </p>
            <button 
              className="btn-primary" 
              onClick={() => setDeviationAlert(null)}
              style={{ 
                marginTop: '16px', 
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                fontWeight: '700'
              }}
            >
              Tushunarli
            </button>
          </div>
        </div>
      )}

      {/* Out of Route Modal (informative when toggled far from route) */}
      {routeWarning && (
        <div className="driver-modal-overlay" onClick={() => setRouteWarning(null)}>
          <div className="driver-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="driver-modal-close" onClick={() => setRouteWarning(null)}>
              <X size={20} />
            </button>
            <div className="driver-modal-icon-wrap" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
              <Navigation size={36} color="#3b82f6" />
            </div>
            <h3 className="driver-modal-title">Marshrutdan uzoqdasiz</h3>
            <p className="driver-modal-desc">
              {routeWarning}
            </p>
            <button 
              className="btn-primary" 
              onClick={() => setRouteWarning(null)}
              style={{ 
                marginTop: '16px', 
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                fontWeight: '700'
              }}
            >
              Tushunarli
            </button>
          </div>
        </div>
      )}

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} unreadCount={unreadCount} />
    </div>
  )
}

export default App
