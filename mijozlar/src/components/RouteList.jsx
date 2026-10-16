import React, { useState, useEffect } from 'react';
import VehicleCard from './VehicleCard';
import { Loader2, Bus, AlertCircle, Navigation, MapPinOff } from 'lucide-react';

// Distance calculation utility (Haversine formula in meters)
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

// Distance from point P to line segment AB in meters
function getDistanceToSegment(pLat, pLng, aLat, aLng, bLat, bLng) {
  const latFactor = 111320;
  const lonFactor = 111320 * Math.cos(((aLat + bLat) / 2 * Math.PI) / 180);

  const px = (pLng - aLng) * lonFactor;
  const py = (pLat - aLat) * latFactor;
  const bx = (bLng - aLng) * lonFactor;
  const by = (bLat - aLat) * latFactor;

  const abLenSq = bx * bx + by * by;
  if (abLenSq === 0) {
    return Math.sqrt(px * px + py * py);
  }

  const t = Math.max(0, Math.min(1, (px * bx + py * by) / abLenSq));
  const projX = t * bx;
  const projY = t * by;

  const dx = px - projX;
  const dy = py - projY;
  return Math.sqrt(dx * dx + dy * dy);
}

// Minimum distance from user coordinate to route polyline/stops
function getMinDistanceToRoute(userLat, userLng, points) {
  if (!points || points.length === 0) return Infinity;
  if (points.length === 1) {
    return getDistanceMeters(userLat, userLng, points[0][0], points[0][1]);
  }
  let minDist = Infinity;
  for (let i = 0; i < points.length - 1; i++) {
    const d = getDistanceToSegment(
      userLat, userLng,
      points[i][0], points[i][1],
      points[i + 1][0], points[i + 1][1]
    );
    if (d < minDist) {
      minDist = d;
    }
  }
  return minDist;
}

// Extract [lat, lng] array from route polyline or stops
function extractRoutePoints(route) {
  if (!route) return [];
  if (Array.isArray(route.polyline) && route.polyline.length >= 2) {
    const pts = route.polyline.map(p => {
      if (Array.isArray(p)) return [Number(p[0]), Number(p[1])];
      if (p && typeof p.lat !== 'undefined' && typeof p.lng !== 'undefined') {
        return [Number(p.lat), Number(p.lng)];
      }
      return null;
    }).filter(Boolean);
    if (pts.length >= 2) return pts;
  }
  if (Array.isArray(route.stops) && route.stops.length > 0) {
    return route.stops.map(s => {
      if (s && typeof s.lat !== 'undefined' && typeof s.lng !== 'undefined') {
        return [Number(s.lat), Number(s.lng)];
      }
      return null;
    }).filter(Boolean);
  }
  return [];
}

// Calculate bearing between two points
function getBearing(lat1, lon1, lat2, lon2) {
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.cos(dLon);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

function getRouteSegmentBearing(driverLat, driverLng, polyPoints) {
  if (!polyPoints || polyPoints.length < 2) return null;
  let minDist = Infinity;
  let bestBearing = 0;

  for (let i = 0; i < polyPoints.length - 1; i++) {
    const p1 = polyPoints[i];
    const p2 = polyPoints[i + 1];
    const d = getDistanceToSegment(driverLat, driverLng, p1[0], p1[1], p2[0], p2[1]);
    if (d < minDist) {
      minDist = d;
      bestBearing = getBearing(p1[0], p1[1], p2[0], p2[1]);
    }
  }
  return bestBearing;
}

// Calculates cumulative distance along the polyline from start to the projection of (pLat, pLng)
function getRouteProgress(pLat, pLng, polyPoints) {
  if (!polyPoints || polyPoints.length < 2) return 0;

  let bestSegmentIndex = 0;
  let bestT = 0;
  let minPerpDistance = Infinity;

  const cumDistances = [0];
  for (let i = 0; i < polyPoints.length - 1; i++) {
    const segLen = getDistanceMeters(
      polyPoints[i][0], polyPoints[i][1],
      polyPoints[i + 1][0], polyPoints[i + 1][1]
    );
    cumDistances.push(cumDistances[i] + segLen);
  }

  for (let i = 0; i < polyPoints.length - 1; i++) {
    const aLat = polyPoints[i][0];
    const aLng = polyPoints[i][1];
    const bLat = polyPoints[i + 1][0];
    const bLng = polyPoints[i + 1][1];

    const latFactor = 111320;
    const lonFactor = 111320 * Math.cos(((aLat + bLat) / 2 * Math.PI) / 180);

    const px = (pLng - aLng) * lonFactor;
    const py = (pLat - aLat) * latFactor;
    const bx = (bLng - aLng) * lonFactor;
    const by = (bLat - aLat) * latFactor;

    const abLenSq = bx * bx + by * by;
    let t = 0;
    let perpDist = 0;
    if (abLenSq === 0) {
      perpDist = Math.sqrt(px * px + py * py);
    } else {
      t = Math.max(0, Math.min(1, (px * bx + py * by) / abLenSq));
      const projX = t * bx;
      const projY = t * by;
      const dx = px - projX;
      const dy = py - projY;
      perpDist = Math.sqrt(dx * dx + dy * dy);
    }

    if (perpDist < minPerpDistance) {
      minPerpDistance = perpDist;
      bestSegmentIndex = i;
      bestT = t;
    }
  }

  const segLength = (cumDistances[bestSegmentIndex + 1] || cumDistances[bestSegmentIndex]) - cumDistances[bestSegmentIndex];
  return cumDistances[bestSegmentIndex] + bestT * segLength;
}

export default function RouteList({ 
  onSelectRoute,
  isUserLocationActive = false,
  setIsUserLocationActive,
  userLocation = null,
  setUserLocation,
  userDistanceToRoute = null,
  setUserDistanceToRoute
}) {
  const [routes, setRoutes] = useState([]);
  const [liveDrivers, setLiveDrivers] = useState([]);
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [selectedDirection, setSelectedDirection] = useState('ketmoqda'); // 'ketmoqda' | 'kelmoqda'
  const [loading, setLoading] = useState(true);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState(null);

  const fetchRoutes = async () => {
    try {
      const routesRes = await fetch('/api/routes');
      if (routesRes.ok) {
        const routesData = await routesRes.json();
        setRoutes(routesData || []);
        if (routesData.length > 0 && !selectedRouteId) {
          setSelectedRouteId(routesData[0].id);
        }
      }
    } catch (e) {
      console.error("Marshrutlarni yuklashda xatolik:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchLiveDrivers = async () => {
    try {
      const driversRes = await fetch('/api/live-drivers', { cache: 'no-store' });
      if (driversRes.ok) {
        const driversData = await driversRes.json();
        setLiveDrivers(driversData || []);
      }
    } catch (e) {
      // Quiet background failure
    }
  };

  useEffect(() => {
    fetchRoutes();
    fetchLiveDrivers();
    const interval = setInterval(fetchLiveDrivers, 2000);
    return () => clearInterval(interval);
  }, []);

  const activeRoute = (selectedRouteId && routes.find(r => r.id === selectedRouteId)) || routes[0];

  // Location Toggle handler with 300 meter route proximity requirement
  const handleToggleLocation = () => {
    if (isUserLocationActive) {
      if (setIsUserLocationActive) setIsUserLocationActive(false);
      if (setUserLocation) setUserLocation(null);
      if (setUserDistanceToRoute) setUserDistanceToRoute(null);
      setLocationError(null);
      return;
    }

    if (!navigator.geolocation) {
      setLocationError("Qurilmangizda geolokatsiya qo'llab-quvvatlanmaydi.");
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    // Request iOS orientation permission on user tap
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        DeviceOrientationEvent.requestPermission().catch(() => {});
      } catch (e) {}
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const uLat = pos.coords.latitude;
        const uLng = pos.coords.longitude;

        const points = extractRoutePoints(activeRoute);
        if (points.length === 0) {
          if (setIsUserLocationActive) setIsUserLocationActive(true);
          if (setUserLocation) setUserLocation({ lat: uLat, lng: uLng });
          if (setUserDistanceToRoute) setUserDistanceToRoute(0);
          return;
        }

        const minDist = getMinDistanceToRoute(uLat, uLng, points);
        const roundedDist = Math.round(minDist);

        if (minDist > 300) {
          // Reject activation if more than 300m away
          if (setIsUserLocationActive) setIsUserLocationActive(false);
          if (setUserLocation) setUserLocation(null);
          if (setUserDistanceToRoute) setUserDistanceToRoute(roundedDist);
          setLocationError(`Siz marshrut chizig'idan ${roundedDist} metr uzoqdasiz. Joylashuv faqat marshrutga 300 metr masofa ichida yoqiladi!`);
        } else {
          // Accept activation within 300m
          if (setIsUserLocationActive) setIsUserLocationActive(true);
          if (setUserLocation) setUserLocation({ lat: uLat, lng: uLng });
          if (setUserDistanceToRoute) setUserDistanceToRoute(roundedDist);
          setLocationError(null);
        }
      },
      (err) => {
        setIsLocating(false);
        console.warn("Geolokatsiya xatosi:", err);
        setLocationError("Joylashuvingizni aniqlab bo'lmadi. GPS yoqilganligini va ruxsat berilganligini tekshiring.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
  };

  if (loading) {
    return (
      <div className="vehicles-loading-state">
        <Loader2 className="animate-spin" size={28} />
        <p>Avtomobillar ma'lumotlari yuklanmoqda...</p>
      </div>
    );
  }

  const getStopName = (stop, fallback) => {
    if (!stop) return fallback;
    if (typeof stop === 'object') return stop.name || fallback;
    return String(stop);
  };

  let startStopName = "Bosh bekat";
  let endStopName = "Yakuniy bekat";

  if (activeRoute) {
    const stops = Array.isArray(activeRoute.stops) ? activeRoute.stops : [];
    if (stops.length >= 2) {
      startStopName = getStopName(stops[0], "Bosh bekat");
      endStopName = getStopName(stops[stops.length - 1], "Yakuniy bekat");
    } else if (activeRoute.direction) {
      const parts = activeRoute.direction.split(/[-→—]/).map(s => s.trim());
      if (parts.length >= 2) {
        startStopName = parts[0];
        endStopName = parts[1];
      }
    }
  }

  const forwardDirTitle = `${startStopName} - ${endStopName}`;
  const backwardDirTitle = `${endStopName} - ${startStopName}`;

  // Process vehicles: Calculate stops and ETA (User ETA vs Next Stop ETA)
  const processedVehicles = (liveDrivers || []).map(driver => {
    let currentStopName = "1-bekat (Bosh bekat)";
    let nextStopName = "";
    let etaMinutes = 3;
    let etaSubtitle = "keyingi bekatga";
    let userDistMeters = null;
    let userDistanceText = null;

    if (!driver || !driver.route_id) return null;
    const driverRoute = routes.find(r => String(r.id) === String(driver.route_id));
    if (!driverRoute) return null;
    const stops = driverRoute && Array.isArray(driverRoute.stops) ? driverRoute.stops : [];

    if (stops.length > 0 && driver.latitude && driver.longitude) {
      let minDist = Infinity;
      let closestIdx = 0;

      stops.forEach((s, idx) => {
        if (s && s.lat && s.lng) {
          const d = getDistanceMeters(Number(driver.latitude), Number(driver.longitude), Number(s.lat), Number(s.lng));
          if (d < minDist) {
            minDist = d;
            closestIdx = idx;
          }
        }
      });

      const closestStop = stops[closestIdx];
      const sName = typeof closestStop === 'object' ? closestStop.name : String(closestStop);
      
      if (minDist < 120) {
        currentStopName = `${sName} bekatida`;
      } else {
        currentStopName = `${sName} yaqinida`;
      }

      // Next stop
      if (closestIdx < stops.length - 1) {
        const nStop = stops[closestIdx + 1];
        nextStopName = typeof nStop === 'object' ? nStop.name : String(nStop);
        const distToNext = getDistanceMeters(Number(driver.latitude), Number(driver.longitude), Number(nStop.lat), Number(nStop.lng));
        // Default ETA when user location is OFF: time to next stop (~400 m/min)
        etaMinutes = Math.max(1, Math.round(distToNext / 400));
        etaSubtitle = "keyingi bekatga";
      } else {
        nextStopName = "Oxirgi bekat";
        etaMinutes = 1;
        etaSubtitle = "keyingi bekatga";
      }
    }

    // Direction calculation
    let direction = 'ketmoqda';
    const polyPoints = extractRoutePoints(driverRoute);
    if (polyPoints.length >= 2 && driver.latitude && driver.longitude) {
      const dLat = Number(driver.latitude);
      const dLng = Number(driver.longitude);
      const heading = Number(driver.heading);
      const routeBearing = getRouteSegmentBearing(dLat, dLng, polyPoints);

      if (heading && !isNaN(heading) && (Number(driver.speed || 0) > 1 || heading > 0) && routeBearing !== null) {
        let diff = Math.abs(heading - routeBearing) % 360;
        if (diff > 180) diff = 360 - diff;
        direction = diff < 90 ? 'ketmoqda' : 'kelmoqda';
      } else {
        const distToStart = getDistanceMeters(dLat, dLng, polyPoints[0][0], polyPoints[0][1]);
        const distToEnd = getDistanceMeters(dLat, dLng, polyPoints[polyPoints.length - 1][0], polyPoints[polyPoints.length - 1][1]);
        direction = distToStart <= distToEnd ? 'ketmoqda' : 'kelmoqda';
      }
    }

    // WHEN USER LOCATION IS ON: Calculate ETA and check if vehicle has already passed the user
    let hasPassedUser = false;
    if (isUserLocationActive && userLocation && userLocation.lat && userLocation.lng && driver.latitude && driver.longitude && polyPoints.length >= 2) {
      const uLat = Number(userLocation.lat);
      const uLng = Number(userLocation.lng);
      const dLat = Number(driver.latitude);
      const dLng = Number(driver.longitude);

      const userProgress = getRouteProgress(uLat, uLng, polyPoints);
      const vehProgress = getRouteProgress(dLat, dLng, polyPoints);

      if (direction === 'ketmoqda') {
        // Vehicle traveling from Start to End (increasing progress)
        // If vehicle has passed user by more than 50 meters, it has already passed
        if (vehProgress > (userProgress + 50)) {
          hasPassedUser = true;
        } else {
          userDistMeters = Math.max(0, userProgress - vehProgress);
        }
      } else {
        // Vehicle traveling from End to Start (decreasing progress)
        // If vehicle has passed user towards start by more than 50 meters, it has already passed
        if (vehProgress < (userProgress - 50)) {
          hasPassedUser = true;
        } else {
          userDistMeters = Math.max(0, vehProgress - userProgress);
        }
      }

      if (!hasPassedUser && userDistMeters !== null) {
        // City travel time at ~380m/min
        etaMinutes = Math.max(1, Math.round(userDistMeters / 380));
        etaSubtitle = "sizgacha yetib keladi";
        userDistanceText = userDistMeters >= 1000
          ? `${(userDistMeters / 1000).toFixed(1)} km`
          : `${Math.round(userDistMeters)} m`;
      }
    } else if (isUserLocationActive && userLocation && driver.latitude && driver.longitude) {
      // Fallback if polyPoints < 2
      userDistMeters = getDistanceMeters(
        Number(driver.latitude),
        Number(driver.longitude),
        userLocation.lat,
        userLocation.lng
      );
      etaMinutes = Math.max(1, Math.round((userDistMeters * 1.25) / 380));
      etaSubtitle = "sizgacha yetib keladi";
      userDistanceText = userDistMeters >= 1000
        ? `${(userDistMeters / 1000).toFixed(1)} km`
        : `${Math.round(userDistMeters)} m`;
    }

    return {
      driverId: driver.driver_id,
      driverName: `${driver.name} ${driver.car_number ? `(${driver.car_number})` : (driver.surname || '')}`,
      phone: driver.phone,
      routeId: driver.route_id || driverRoute?.id,
      routeNumber: driver.route_number || driverRoute?.number || "1",
      routeName: driver.route_name || driverRoute?.name || "Marshrut",
      routeColor: driver.route_color || driverRoute?.color || "#0066FF",
      latitude: driver.latitude,
      longitude: driver.longitude,
      speed: driver.speed || 0,
      capacity: driver.capacity || "bosh",
      currentStopName,
      nextStopName,
      etaMinutes,
      etaSubtitle,
      userDistMeters,
      userDistanceText,
      isUserLocationActive,
      hasPassedUser,
      direction,
      directionText: direction === 'ketmoqda' ? 'Ketmoqda' : 'Kelmoqda',
      directionColor: direction === 'ketmoqda' ? (driverRoute?.arrow_color_forward || '#0066FF') : (driverRoute?.arrow_color_backward || '#10B981')
    };
  }).filter(Boolean);

  // Filter vehicles belonging to the current active route
  const routeVehicles = activeRoute
    ? processedVehicles.filter(v => v && v.routeId && String(v.routeId) === String(activeRoute.id))
    : [];

  // When user location is active: ONLY show vehicles that have NOT passed the user yet!
  const forwardVehicles = routeVehicles
    .filter(v => v.direction === 'ketmoqda')
    .filter(v => !isUserLocationActive || !v.hasPassedUser);

  const backwardVehicles = routeVehicles
    .filter(v => v.direction === 'kelmoqda')
    .filter(v => !isUserLocationActive || !v.hasPassedUser);

  // Sort: When user location is active, sort by distance to user so the closest car arrives first (#1)
  // When location is off, sort by time to next stop
  forwardVehicles.sort((a, b) => {
    if (isUserLocationActive && a.userDistMeters != null && b.userDistMeters != null) {
      return a.userDistMeters - b.userDistMeters;
    }
    return a.etaMinutes - b.etaMinutes;
  });

  backwardVehicles.sort((a, b) => {
    if (isUserLocationActive && a.userDistMeters != null && b.userDistMeters != null) {
      return a.userDistMeters - b.userDistMeters;
    }
    return a.etaMinutes - b.etaMinutes;
  });

  const displayedVehicles = selectedDirection === 'ketmoqda' ? forwardVehicles : backwardVehicles;
  const currentDirTitle = selectedDirection === 'ketmoqda' ? forwardDirTitle : backwardDirTitle;
  const otherVehiclesCount = selectedDirection === 'ketmoqda' ? backwardVehicles.length : forwardVehicles.length;
  const otherDirTitle = selectedDirection === 'ketmoqda' ? backwardDirTitle : forwardDirTitle;

  return (
    <div className="vehicles-page-container">
      {/* Route Switcher if multiple routes exist */}
      {routes.length > 1 && (
        <div className="route-switcher-bar">
          {routes.map(r => (
            <button 
              key={r.id}
              type="button"
              className={`route-tab-pill ${r.id === activeRoute?.id ? 'active' : ''}`}
              onClick={() => setSelectedRouteId(r.id)}
            >
              <span className="pill-num" style={{ background: r.color || '#0066FF' }}>{r.number}</span>
              <span>{r.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Direction Switcher: 1-bo'lim (Boshlanish -> Yakuniy) va 2-bo'lim (Yakuniy -> Boshlanish) */}
      <div className="direction-switcher-container">
        <button 
          type="button"
          className={`direction-tab-btn ${selectedDirection === 'ketmoqda' ? 'active' : ''}`}
          onClick={() => setSelectedDirection('ketmoqda')}
          style={{
            '--dir-color': activeRoute?.arrow_color_forward || '#0066FF'
          }}
        >
          <span className="direction-tab-title">
            {forwardDirTitle}
          </span>
          <span className="direction-tab-badge">
            {forwardVehicles.length}
          </span>
        </button>

        <button 
          type="button"
          className={`direction-tab-btn ${selectedDirection === 'kelmoqda' ? 'active' : ''}`}
          onClick={() => setSelectedDirection('kelmoqda')}
          style={{
            '--dir-color': activeRoute?.arrow_color_backward || '#10B981'
          }}
        >
          <span className="direction-tab-title">
            {backwardDirTitle}
          </span>
          <span className="direction-tab-badge">
            {backwardVehicles.length}
          </span>
        </button>
      </div>

      {/* User Location Widget (Joylashuvni yoqish / o'chirish) */}
      <div className={`user-location-widget ${isUserLocationActive ? 'is-active' : 'is-inactive'}`}>
        <div className="location-widget-info">
          <div className="location-status-icon">
            {isUserLocationActive ? (
              <Navigation size={18} color="#0066FF" />
            ) : (
              <MapPinOff size={18} color="#EF4444" />
            )}
          </div>
          <div className="location-widget-text">
            <div className="location-widget-title">
              <span>Joylashuv</span>
              {isUserLocationActive ? (
                <span className="location-range-tag">Faol (Marshrutda)</span>
              ) : (
                <span className="location-offline-tag">O'chiq</span>
              )}
            </div>
            <div className="location-widget-desc">
              {isUserLocationActive 
                ? `Marshrutgacha: ${userDistanceToRoute || 0} m • Sizgacha kelish vaqti hisoblanmoqda`
                : "Faqat marshrut chizig'iga 300 m yaqin masofada yoqiladi"}
            </div>
          </div>
        </div>

        <button 
          type="button"
          className={`location-toggle-action-btn ${isUserLocationActive ? 'btn-turn-off' : 'btn-turn-on'}`}
          onClick={handleToggleLocation}
          disabled={isLocating}
        >
          {isLocating ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Loader2 className="animate-spin" size={13} /> Aniqlanmoqda...
            </span>
          ) : isUserLocationActive ? (
            "O'chirish"
          ) : (
            "Joylashuvni yoqish"
          )}
        </button>
      </div>

      {/* Location Warning / Alert Banner */}
      {locationError && (
        <div className="location-warning-banner">
          <AlertCircle size={18} color="#EF4444" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div className="location-warning-text">
            <span>{locationError}</span>
          </div>
          <button 
            type="button" 
            className="location-warning-close"
            onClick={() => setLocationError(null)}
          >
            ✕
          </button>
        </div>
      )}

      {/* Vehicles List (Filtered by selected direction) */}
      {displayedVehicles.length > 0 ? (
        <div className="vehicles-list-grid">
          {displayedVehicles.map((vehicle, idx) => (
            <VehicleCard
              key={vehicle.driverId || idx}
              rank={idx + 1}
              vehicle={vehicle}
              routeColor={vehicle.routeColor}
              onSelectVehicle={(veh) => {
                if (onSelectRoute) {
                  onSelectRoute(veh.routeId);
                }
              }}
            />
          ))}
        </div>
      ) : (
        <div className="direction-empty-card">
          <div className="empty-icon-wrap" style={{ background: '#f8fafc', width: '56px', height: '56px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bus size={32} color="#94a3b8" />
          </div>
          <h3>
            {isUserLocationActive ? "Siz tomonga kelayotgan avtomobil yo'q" : "Ushbu yo'nalishda faol avtomobil yo'q"}
          </h3>
          <p>
            {isUserLocationActive ? (
              <span><strong>{currentDirTitle}</strong> yo'nalishida siz turgan joyga hali yetib kelmagan avtomobillar hozircha yo'q yoki o'tib ketgan.</span>
            ) : (
              <span><strong>{currentDirTitle}</strong> yo'nalishida hozircha avtomobillar harakatlanmayapti.</span>
            )}
          </p>
          {otherVehiclesCount > 0 && (
            <button 
              type="button"
              className="direction-switch-hint-btn"
              onClick={() => setSelectedDirection(selectedDirection === 'ketmoqda' ? 'kelmoqda' : 'ketmoqda')}
            >
              <span>{otherDirTitle} ({otherVehiclesCount} ta faol)</span>
              ➔
            </button>
          )}
        </div>
      )}
    </div>
  );
}
