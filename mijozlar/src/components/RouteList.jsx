import React, { useState, useEffect, useRef } from 'react';
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

function getRouteTotalDistance(points) {
  if (!points || points.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    total += getDistanceMeters(points[i][0], points[i][1], points[i + 1][0], points[i + 1][1]);
  }
  return total;
}

export default function RouteList({ 
  onSelectRoute,
  selectedRouteId: propRouteId,
  setSelectedRouteId: setPropRouteId,
  selectedDirection: propDirection,
  setSelectedDirection: setPropDirection,
  isUserLocationActive = false,
  setIsUserLocationActive,
  userLocation = null,
  setUserLocation,
  userDistanceToRoute = null,
  setUserDistanceToRoute
}) {
  const [routes, setRoutes] = useState([]);
  const [liveDrivers, setLiveDrivers] = useState([]);
  const [localRouteId, setLocalRouteId] = useState(null);
  const [localDirection, setLocalDirection] = useState('ketmoqda');

  const selectedRouteId = propRouteId !== undefined && propRouteId !== null ? propRouteId : localRouteId;
  const setSelectedRouteId = setPropRouteId || setLocalRouteId;

  const selectedDirection = propDirection !== undefined && propDirection !== null ? propDirection : localDirection;
  const setSelectedDirection = setPropDirection || setLocalDirection;

  const [loading, setLoading] = useState(true);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const prevDirectionsRef = useRef({});

  const fetchRoutes = async () => {
    try {
      const routesRes = await fetch('/api/routes');
      if (routesRes.ok) {
        const routesData = await routesRes.json();
        setRoutes(routesData || []);
        if (routesData.length > 0) {
          const activeR = routesData.find(r => r.is_active) || routesData[0];
          if (!selectedRouteId || !routesData.some(r => r.id === selectedRouteId && r.is_active)) {
            setSelectedRouteId(activeR.id);
          }
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
    const interval = setInterval(fetchLiveDrivers, 1500);
    return () => clearInterval(interval);
  }, []);

  // Continuous real-time location watch when location is active
  useEffect(() => {
    if (!isUserLocationActive || !navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const uLat = pos.coords.latitude;
        const uLng = pos.coords.longitude;
        if (setUserLocation) setUserLocation({ lat: uLat, lng: uLng });
      },
      (err) => console.warn("User watch error:", err),
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [isUserLocationActive]);

  const activeRoute = (selectedRouteId && routes.find(r => r.id === selectedRouteId && r.is_active)) || routes.find(r => r.is_active) || routes[0];

  // Location Toggle handler with 2 km (2000 meter) route proximity requirement
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

        if (minDist > 2000) {
          // Reject activation if more than 2 km away
          if (setIsUserLocationActive) setIsUserLocationActive(false);
          if (setUserLocation) setUserLocation(null);
          if (setUserDistanceToRoute) setUserDistanceToRoute(roundedDist);
          const distText = roundedDist >= 1000 ? `${(roundedDist / 1000).toFixed(1)} km` : `${roundedDist} metr`;
          setLocationError(`Siz marshrut chizig'idan ${distText} uzoqdasiz. Joylashuv faqat marshrutga 2 km masofa ichida yoqiladi!`);
        } else {
          // Accept activation within 2 km
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

  // Process vehicles: Calculate stops, dynamic route progress and real-time live ETA
  const processedVehicles = (liveDrivers || []).map(driver => {
    let currentStopName = "1-bekat (Bosh bekat)";
    let nextStopName = "";
    let etaMinutes = 3;
    let etaSubtitle = "keyingi bekatga";
    let userDistMeters = null;
    let userDistanceText = null;
    let arrivalStatus = 'approaching'; // 'approaching' | 'arrived' | 'passed'
    let hasPassedUser = false;

    if (!driver || !driver.route_id) return null;
    const driverRoute = routes.find(r => String(r.id) === String(driver.route_id));
    if (!driverRoute) return null;
    const stops = driverRoute && Array.isArray(driverRoute.stops) ? driverRoute.stops : [];
    const polyPoints = extractRoutePoints(driverRoute);
    const totalRouteDist = polyPoints.length >= 2 ? getRouteTotalDistance(polyPoints) : 0;

    const dLat = Number(driver.latitude);
    const dLng = Number(driver.longitude);
    if (!dLat || !dLng || isNaN(dLat) || isNaN(dLng)) return null;

    // 1. Closest Stop determination
    if (stops.length > 0) {
      let minDist = Infinity;
      let closestIdx = 0;

      stops.forEach((s, idx) => {
        if (s && s.lat && s.lng) {
          const d = getDistanceMeters(dLat, dLng, Number(s.lat), Number(s.lng));
          if (d < minDist) {
            minDist = d;
            closestIdx = idx;
          }
        }
      });

      const closestStop = stops[closestIdx];
      const sName = typeof closestStop === 'object' ? closestStop.name : String(closestStop);
      currentStopName = minDist < 120 ? `${sName} bekatida` : `${sName} yaqinida`;
    }

    // 2. Real-time Direction calculation: Based on terminals, GPS heading and route progress
    const driverId = String(driver.driver_id || driver.id);
    let direction = 'ketmoqda';
    if (polyPoints.length >= 2) {
      if (driver.last_terminal === 'start') {
        direction = 'ketmoqda';
      } else if (driver.last_terminal === 'end') {
        direction = 'kelmoqda';
      } else {
        const startPt = polyPoints[0];
        const endPt = polyPoints[polyPoints.length - 1];
        const distToStart = getDistanceMeters(dLat, dLng, startPt[0], startPt[1]);
        const distToEnd = getDistanceMeters(dLat, dLng, endPt[0], endPt[1]);

        if (distToStart <= 400) {
          direction = 'ketmoqda';
        } else if (distToEnd <= 400) {
          direction = 'kelmoqda';
        } else if (prevDirectionsRef.current[driverId]) {
          direction = prevDirectionsRef.current[driverId];
        } else {
          direction = distToStart <= distToEnd ? 'ketmoqda' : 'kelmoqda';
        }
      }
      prevDirectionsRef.current[driverId] = direction;
    }

    const vehProgress = polyPoints.length >= 2 ? getRouteProgress(dLat, dLng, polyPoints) : 0;

    // 3. CASE A: WHEN PASSENGER LOCATION IS OFF
    // Calculate live distance and ETA to the trip destination along route polyline
    if (!isUserLocationActive) {
      if (direction === 'ketmoqda') {
        nextStopName = endStopName;
        const remainingDist = Math.max(0, totalRouteDist - vehProgress);
        etaMinutes = Math.max(1, Math.round(remainingDist / 420));
        const distKm = (remainingDist / 1000).toFixed(1);
        etaSubtitle = `${endStopName}ga (~${distKm} km)`;
        userDistanceText = `${distKm} km`;
      } else {
        nextStopName = startStopName;
        const remainingDist = Math.max(0, vehProgress);
        etaMinutes = Math.max(1, Math.round(remainingDist / 420));
        const distKm = (remainingDist / 1000).toFixed(1);
        etaSubtitle = `${startStopName}ga (~${distKm} km)`;
        userDistanceText = `${distKm} km`;
      }
    }

    // 4. CASE B: WHEN PASSENGER LOCATION IS ON
    // Calculate live ETA and distance from moving vehicle directly to user
    if (isUserLocationActive && userLocation && userLocation.lat && userLocation.lng) {
      const uLat = Number(userLocation.lat);
      const uLng = Number(userLocation.lng);

      let distMeters = 0;
      if (polyPoints.length >= 2) {
        const userProgress = getRouteProgress(uLat, uLng, polyPoints);
        if (direction === 'ketmoqda') {
          if (vehProgress > userProgress + 60) {
            hasPassedUser = true;
            distMeters = vehProgress - userProgress;
          } else {
            hasPassedUser = false;
            distMeters = Math.max(0, userProgress - vehProgress);
          }
        } else {
          if (vehProgress < userProgress - 60) {
            hasPassedUser = true;
            distMeters = userProgress - vehProgress;
          } else {
            hasPassedUser = false;
            distMeters = Math.max(0, vehProgress - userProgress);
          }
        }
      } else {
        distMeters = getDistanceMeters(dLat, dLng, uLat, uLng);
      }

      userDistMeters = Math.round(distMeters);
      userDistanceText = distMeters >= 1000 ? `${(distMeters / 1000).toFixed(1)} km` : `${Math.round(distMeters)} m`;

      if (distMeters <= 70) {
        arrivalStatus = 'arrived';
        etaMinutes = 0;
        etaSubtitle = "Yoningizda (Sizni kutyapti)";
      } else if (hasPassedUser) {
        arrivalStatus = 'passed';
        etaMinutes = Math.max(1, Math.round(distMeters / 400));
        etaSubtitle = "O'tib ketdi";
      } else {
        arrivalStatus = 'approaching';
        etaMinutes = Math.max(1, Math.round(distMeters / 400));
        etaSubtitle = "sizgacha yetib keladi";
      }
    }

    return {
      driverId: driver.driver_id || driver.id,
      driverName: `${driver.name} ${driver.car_number ? `(${driver.car_number})` : (driver.surname || '')}`,
      carNumber: driver.car_number || driver.surname || "",
      phone: driver.phone,
      routeId: driver.route_id || driverRoute?.id,
      routeNumber: driver.route_number || driverRoute?.number || "1",
      routeName: driver.route_name || driverRoute?.name || "Marshrut",
      routeColor: driver.route_color || driverRoute?.color || "#0066FF",
      latitude: dLat,
      longitude: dLng,
      speed: driver.speed || 0,
      currentStopName,
      nextStopName,
      etaMinutes,
      etaSubtitle,
      userDistMeters,
      userDistanceText,
      isUserLocationActive,
      hasPassedUser,
      arrivalStatus,
      direction,
      directionText: direction === 'ketmoqda' ? 'Ketmoqda' : 'Kelmoqda',
      directionColor: direction === 'ketmoqda' ? (driverRoute?.arrow_color_forward || '#0066FF') : (driverRoute?.arrow_color_backward || '#10B981')
    };
  }).filter(Boolean);

  // Filter vehicles belonging to the current active route
  const routeVehicles = activeRoute
    ? processedVehicles.filter(v => v && v.routeId && String(v.routeId) === String(activeRoute.id))
    : [];

  const forwardVehicles = routeVehicles.filter(v => v.direction === 'ketmoqda');
  const backwardVehicles = routeVehicles.filter(v => v.direction === 'kelmoqda');

  // Sort vehicles: Approaching and Arrived come first by distance, Passed vehicles placed at the end
  const sortVehicles = (list) => {
    return [...list].sort((a, b) => {
      // 1. If location is active: approaching/arrived vehicles prioritized over passed
      if (isUserLocationActive) {
        if (a.hasPassedUser !== b.hasPassedUser) {
          return a.hasPassedUser ? 1 : -1;
        }
        if (a.userDistMeters != null && b.userDistMeters != null) {
          return a.userDistMeters - b.userDistMeters;
        }
      }
      return a.etaMinutes - b.etaMinutes;
    });
  };

  const sortedForwardVehicles = sortVehicles(forwardVehicles);
  const sortedBackwardVehicles = sortVehicles(backwardVehicles);

  const displayedVehicles = selectedDirection === 'ketmoqda' ? sortedForwardVehicles : sortedBackwardVehicles;
  const currentDirTitle = selectedDirection === 'ketmoqda' ? forwardDirTitle : backwardDirTitle;
  const otherVehiclesCount = selectedDirection === 'ketmoqda' ? backwardVehicles.length : forwardVehicles.length;
  const otherDirTitle = selectedDirection === 'ketmoqda' ? backwardDirTitle : forwardDirTitle;

  return (
    <div className="vehicles-page-container">
      {/* Route Switcher if multiple active routes exist */}
      {routes.filter(r => r.is_active).length > 1 && (
        <div className="route-switcher-bar">
          {routes.filter(r => r.is_active).map(r => (
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
                ? `Marshrutgacha: ${userDistanceToRoute >= 1000 ? (userDistanceToRoute / 1000).toFixed(1) + ' km' : (userDistanceToRoute || 0) + ' m'} • Sizgacha kelish vaqti hisoblanmoqda`
                : "Faqat marshrut chizig'iga 2 km yaqin masofada yoqiladi"}
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
                  onSelectRoute(veh.routeId, veh.direction || selectedDirection);
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
