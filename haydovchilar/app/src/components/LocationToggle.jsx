import React, { useState } from 'react';
import { Navigation, AlertTriangle, X, CheckCircle2 } from 'lucide-react';

// Distance calculation functions
function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function getDistanceToSegment(pLat, pLng, aLat, aLng, bLat, bLng) {
  const dAB = getDistanceMeters(aLat, aLng, bLat, bLng);
  if (dAB === 0) return getDistanceMeters(pLat, pLng, aLat, aLng);

  const t = Math.max(
    0,
    Math.min(
      1,
      ((pLat - aLat) * (bLat - aLat) + (pLng - aLng) * (bLng - aLng)) /
        ((bLat - aLat) ** 2 + (bLng - aLng) ** 2)
    )
  );

  const projLat = aLat + t * (bLat - aLat);
  const projLng = aLng + t * (bLng - aLng);
  return getDistanceMeters(pLat, pLng, projLat, projLng);
}

function calculateMinDistanceToRoute(driverLat, driverLng, route) {
  if (!route) return 0;
  let minDist = Infinity;

  // Check polyline
  if (Array.isArray(route.polyline) && route.polyline.length > 0) {
    for (let i = 0; i < route.polyline.length; i++) {
      const p = route.polyline[i];
      const d = getDistanceMeters(driverLat, driverLng, p[0], p[1]);
      if (d < minDist) minDist = d;

      if (i < route.polyline.length - 1) {
        const nextP = route.polyline[i + 1];
        const segDist = getDistanceToSegment(driverLat, driverLng, p[0], p[1], nextP[0], nextP[1]);
        if (segDist < minDist) minDist = segDist;
      }
    }
  }

  // Check stops
  if (Array.isArray(route.stops) && route.stops.length > 0) {
    for (let s of route.stops) {
      if (s && s.lat && s.lng) {
        const d = getDistanceMeters(driverLat, driverLng, Number(s.lat), Number(s.lng));
        if (d < minDist) minDist = d;
      }
    }
  }

  return minDist === Infinity ? 0 : minDist;
}

export default function LocationToggle({ 
  enabled, 
  setEnabled, 
  assignedRoute, 
  onLocationUpdate,
  onNavigateToStart
}) {
  const [checking, setChecking] = useState(false);
  const [distanceError, setDistanceError] = useState(null);
  const [gpsPromptModal, setGpsPromptModal] = useState(null); // 'turn_on' | 'turn_off' | null

  const openDeviceSettings = () => {
    const tg = window.Telegram?.WebApp;
    const lm = tg?.LocationManager;
    if (lm && typeof lm.openSettings === 'function') {
      try {
        lm.openSettings();
      } catch (e) {
        console.warn("LocationManager openSettings error:", e);
      }
    } else {
      alert("Iltimos, telefoningiz sozlamalaridan GPS (Joylashuv)ni o'zgartiring.");
    }
  };

  const startLocationActivation = () => {
    const tg = window.Telegram?.WebApp;
    const lm = tg?.LocationManager;

    setChecking(true);

    const onPosSuccess = (position) => {
      setChecking(false);
      setGpsPromptModal(null);
      const driverLat = position.coords.latitude;
      const driverLng = position.coords.longitude;

      // If assigned route exists, verify 1 km distance rule
      if (assignedRoute) {
        const minDist = calculateMinDistanceToRoute(driverLat, driverLng, assignedRoute);
        if (minDist > 1000) {
          setDistanceError({
            distanceKm: (minDist / 1000).toFixed(1),
            routeName: assignedRoute.name || `${assignedRoute.number}-marshrut`,
            driverCoords: { lat: driverLat, lng: driverLng }
          });
          return;
        }
      }

      // Within 1 km or verified: activate location!
      setDistanceError(null);
      if (onLocationUpdate) {
        onLocationUpdate(position);
      }
      setEnabled(true, position);
    };

    // 1. If Telegram LocationManager is available
    if (lm && typeof lm.getLocation === 'function') {
      // If we already know device GPS switch is OFF in Android
      if (lm.isInited && !lm.isLocationAvailable) {
        setChecking(false);
        if (typeof lm.openSettings === 'function') {
          try { lm.openSettings(); } catch (e) {}
        }
        setGpsPromptModal('turn_on');
        return;
      }

      lm.getLocation((pos) => {
        if (pos && typeof pos.latitude === 'number' && typeof pos.longitude === 'number') {
          onPosSuccess({
            coords: {
              latitude: pos.latitude,
              longitude: pos.longitude,
              heading: pos.course || 0,
              speed: pos.speed || 0,
              accuracy: pos.accuracy || 10
            }
          });
        } else {
          // If Telegram LocationManager didn't return coordinates (e.g. GPS off)
          setChecking(false);
          if (lm && !lm.isLocationAvailable && typeof lm.openSettings === 'function') {
            try { lm.openSettings(); } catch (e) {}
            setGpsPromptModal('turn_on');
          } else {
            fallbackHtml5(onPosSuccess);
          }
        }
      });
      return;
    }

    // 2. Standard HTML5 Geolocation fallback
    fallbackHtml5(onPosSuccess);
  };

  const fallbackHtml5 = (onPosSuccess) => {
    if (!("geolocation" in navigator)) {
      setChecking(false);
      alert("Qurilmangizda GPS joylashuvni aniqlash mavjud emas.");
      return;
    }

    const onPosError = (error) => {
      navigator.geolocation.getCurrentPosition(
        onPosSuccess,
        (err2) => {
          setChecking(false);
          const tg = window.Telegram?.WebApp;
          const lm = tg?.LocationManager;
          if (lm && typeof lm.openSettings === 'function') {
            try { lm.openSettings(); } catch (e) {}
            setGpsPromptModal('turn_on');
          } else {
            alert("Joylashuvni aniqlashda xatolik yuz berdi. Iltimos telefoningiz sozlamalarida GPS ni yoqing: " + (err2.message || error.message));
          }
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 5000 }
      );
    };

    navigator.geolocation.getCurrentPosition(
      onPosSuccess,
      onPosError,
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 3000 }
    );
  };

  // Auto-detect when driver switches back from Android Settings
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    const lm = tg?.LocationManager;

    if (lm && typeof lm.init === 'function' && !lm.isInited) {
      try { lm.init(); } catch (e) {}
    }

    const handleResumeOrUpdate = () => {
      if (gpsPromptModal === 'turn_on' && lm && lm.isLocationAvailable) {
        setGpsPromptModal(null);
        startLocationActivation();
      }
    };

    if (tg && typeof tg.onEvent === 'function') {
      tg.onEvent('locationManagerUpdated', handleResumeOrUpdate);
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleResumeOrUpdate();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', handleResumeOrUpdate);

    return () => {
      if (tg && typeof tg.offEvent === 'function') {
        tg.offEvent('locationManagerUpdated', handleResumeOrUpdate);
      }
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', handleResumeOrUpdate);
    };
  }, [gpsPromptModal, assignedRoute]);

  const handleToggle = () => {
    const tg = window.Telegram?.WebApp;
    const lm = tg?.LocationManager;

    if (!enabled) {
      // Turning ON
      if (lm && typeof lm.init === 'function' && !lm.isInited) {
        lm.init(() => {
          startLocationActivation();
        });
      } else {
        startLocationActivation();
      }
    } else {
      // Turning OFF
      // 1. Immediately turn off location in app and inform backend
      setEnabled(false);

      // 2. Open Android device location settings directly in response to user click
      if (lm && typeof lm.openSettings === 'function') {
        try {
          lm.openSettings();
        } catch (e) {
          console.warn("openSettings error:", e);
        }
      }

      // 3. Show turn-off guidance modal
      setGpsPromptModal('turn_off');
    }
  };

  return (
    <>
      <div className={`location-card ${enabled ? 'is-active' : ''}`}>
        <div className="location-content">
          <div className="pulse-icon-container">
            <div className="pulse-circle-2">
              <div className="pulse-circle-3">
                <div 
                  className="pulse-icon-inner" 
                  style={{ backgroundColor: enabled ? 'var(--blue-primary)' : 'var(--text-secondary)' }}
                >
                  <Navigation 
                    size={20} 
                    fill="currentColor" 
                    style={{ transform: 'rotate(45deg)', marginLeft: '-2px', marginBottom: '-2px' }} 
                  />
                </div>
              </div>
            </div>
          </div>
          
          <h2 className="location-title">
            {enabled ? "Joylashuv faol" : "Joylashuv o'chirilgan"}
          </h2>
          <p className="location-desc">
            {enabled 
              ? "Sizning joylashuvingiz yo'lovchilarga real vaqtda ko'rinmoqda" 
              : "Sizning joylashuvingiz yo'lovchilarga ko'rinmaydi"}
          </p>
          
          <button 
            className="btn-primary" 
            onClick={handleToggle}
            disabled={checking}
            style={{ 
              backgroundColor: enabled ? 'var(--red)' : 'var(--blue-primary)',
              opacity: checking ? 0.7 : 1,
              marginTop: '8px',
              marginBottom: '4px'
            }}
          >
            <Navigation size={18} fill="currentColor" style={{ transform: 'rotate(45deg)' }} />
            {checking 
              ? "Tekshirilmoqda..." 
              : (enabled ? "Joylashuvni o'chirish" : "Joylashuvni yoqish")}
          </button>
        </div>
      </div>

      {/* Android Turn-On GPS Modal */}
      {gpsPromptModal === 'turn_on' && (
        <div className="driver-modal-overlay" onClick={() => setGpsPromptModal(null)}>
          <div className="driver-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="driver-modal-close" onClick={() => setGpsPromptModal(null)}>
              <X size={20} />
            </button>
            <div className="driver-modal-icon-wrap warning">
              <AlertTriangle size={36} color="#ef4444" />
            </div>
            <h3 className="driver-modal-title">Telefonda GPS o'chirilgan</h3>
            <p className="driver-modal-desc">
              Yo'lovchilarga real vaqtda ko'rinish uchun telefoningiz sozlamalarida joylashuv (GPS)ni yoqing.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
              <button 
                className="btn-primary" 
                onClick={openDeviceSettings}
                style={{ width: '100%', fontSize: '15px' }}
              >
                <Navigation size={18} fill="currentColor" style={{ transform: 'rotate(45deg)' }} />
                <span>Sozlamalarni ochish (GPS yoqish)</span>
              </button>
              <button 
                className="btn-secondary" 
                onClick={() => setGpsPromptModal(null)}
              >
                Bekor qilish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Android Turn-Off GPS Guidance Modal */}
      {gpsPromptModal === 'turn_off' && (
        <div className="driver-modal-overlay" onClick={() => setGpsPromptModal(null)}>
          <div className="driver-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="driver-modal-close" onClick={() => setGpsPromptModal(null)}>
              <X size={20} />
            </button>
            <div className="driver-modal-icon-wrap success">
              <CheckCircle2 size={36} color="#10b981" />
            </div>
            <h3 className="driver-modal-title">Joylashuv to'xtatildi</h3>
            <p className="driver-modal-desc">
              Ilovada joylashuv uzatish to'xtatildi. Batareyani tejash uchun ochilgan sozlamalarda telefon GPS'ini ham o'chirib qo'yishingiz mumkin.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
              <button 
                className="btn-primary" 
                onClick={openDeviceSettings}
                style={{ width: '100%', fontSize: '15px', backgroundColor: '#475569' }}
              >
                <Navigation size={18} style={{ transform: 'rotate(45deg)' }} />
                <span>Sozlamalarni ochish (GPS o'chirish)</span>
              </button>
              <button 
                className="btn-secondary" 
                onClick={() => setGpsPromptModal(null)}
              >
                Tushunarli
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1 KM Distance Exceeded Modal */}
      {distanceError && (
        <div className="driver-modal-overlay" onClick={() => setDistanceError(null)}>
          <div className="driver-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="driver-modal-close" onClick={() => setDistanceError(null)}>
              <X size={20} />
            </button>
            <div className="driver-modal-icon-wrap warning">
              <AlertTriangle size={36} color="#ef4444" />
            </div>
            <h3 className="driver-modal-title">Siz belgilangan marshrutdan uzoqdasiz!</h3>
            <p className="driver-modal-desc">
              Joylashuvni yoqish uchun <strong>{distanceError.routeName}</strong> yo'nalishiga (chizig'iga) boring.
            </p>
            <div className="driver-distance-badge">
              <span>Hozirgi masofangiz:</span>
              <strong>{distanceError.distanceKm} km</strong>
              <span className="distance-limit">(Ruxsat: 1.0 km gacha)</span>
            </div>
            <button 
              className="btn-primary" 
              onClick={() => {
                const coords = distanceError.driverCoords;
                setDistanceError(null);
                if (onNavigateToStart) {
                  onNavigateToStart(coords);
                }
              }}
              style={{ 
                marginTop: '16px', 
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontSize: '16px',
                fontWeight: '700'
              }}
            >
              <span>Ketdik</span>
              <Navigation size={18} fill="currentColor" style={{ transform: 'rotate(45deg)' }} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
