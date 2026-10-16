import React, { useState, useEffect } from 'react';
import VehicleCard from './VehicleCard';
import { Loader2, Bus, AlertCircle } from 'lucide-react';

// Distance calculation utility
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

export default function RouteList({ onSelectRoute }) {
  const [routes, setRoutes] = useState([]);
  const [liveDrivers, setLiveDrivers] = useState([]);
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [selectedDirection, setSelectedDirection] = useState('ketmoqda'); // 'ketmoqda' | 'kelmoqda'
  const [loading, setLoading] = useState(true);

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
    // Real-time polling every 2 seconds for instant updates
    const interval = setInterval(fetchLiveDrivers, 2000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="vehicles-loading-state">
        <Loader2 className="animate-spin" size={28} />
        <p>Avtomobillar ma'lumotlari yuklanmoqda...</p>
      </div>
    );
  }

  const activeRoute = (selectedRouteId && routes.find(r => r.id === selectedRouteId)) || routes[0];

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

  // Calculate detailed vehicle info and arrival ETA for all active drivers
  const processedVehicles = (liveDrivers || []).map(driver => {
    let currentStopName = "1-bekat (Bosh bekat)";
    let nextStopName = "";
    let etaMinutes = 3;

    const driverRoute = routes.find(r => String(r.id) === String(driver.route_id)) || activeRoute;
    const stops = driverRoute && Array.isArray(driverRoute.stops) ? driverRoute.stops : [];

    if (stops.length > 0 && driver.latitude && driver.longitude) {
      // Find closest stop
      let minDist = Infinity;
      let closestIdx = 0;

      stops.forEach((s, idx) => {
        if (s && s.lat && s.lng) {
          const d = getDistanceMeters(driver.latitude, driver.longitude, Number(s.lat), Number(s.lng));
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
        const distToNext = getDistanceMeters(driver.latitude, driver.longitude, Number(nStop.lat), Number(nStop.lng));
        // Urban speed ~400 meters per minute (~25 km/h)
        etaMinutes = Math.max(1, Math.round(distToNext / 400));
      } else {
        nextStopName = "Oxirgi bekat";
        etaMinutes = 1;
      }
    }

    let direction = 'ketmoqda';
    const polyPoints = Array.isArray(driverRoute?.polyline) && driverRoute.polyline.length >= 2
      ? driverRoute.polyline.map(p => [p[0], p[1]])
      : (stops.filter(s => s && typeof s.lat === 'number' && typeof s.lng === 'number').map(s => [s.lat, s.lng]));

    if (polyPoints.length >= 2 && driver.latitude && driver.longitude) {
      const distToStart = getDistanceMeters(Number(driver.latitude), Number(driver.longitude), polyPoints[0][0], polyPoints[0][1]);
      const distToEnd = getDistanceMeters(Number(driver.latitude), Number(driver.longitude), polyPoints[polyPoints.length - 1][0], polyPoints[polyPoints.length - 1][1]);
      direction = distToStart <= distToEnd ? 'ketmoqda' : 'kelmoqda';
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
      direction,
      directionText: direction === 'ketmoqda' ? 'Ketmoqda' : 'Kelmoqda',
      directionColor: direction === 'ketmoqda' ? (driverRoute?.arrow_color_forward || '#0066FF') : (driverRoute?.arrow_color_backward || '#10B981')
    };
  });

  // Sort: Eng tez kelayotgani birinchi chiqadi tepada!
  processedVehicles.sort((a, b) => a.etaMinutes - b.etaMinutes);

  // Filter vehicles belonging to the current active route
  const routeVehicles = activeRoute
    ? processedVehicles.filter(v => String(v.routeId) === String(activeRoute.id))
    : processedVehicles;

  const forwardVehicles = routeVehicles.filter(v => v.direction === 'ketmoqda');
  const backwardVehicles = routeVehicles.filter(v => v.direction === 'kelmoqda');

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
          <h3>Ushbu yo'nalishda faol avtomobil yo'q</h3>
          <p>
            <strong>{currentDirTitle}</strong> yo'nalishida hozircha avtomobillar harakatlanmayapti.
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
