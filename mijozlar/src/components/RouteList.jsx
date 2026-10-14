import React, { useState, useEffect } from 'react';
import VehicleCard from './VehicleCard';
import { Loader2, Bus, AlertCircle, RefreshCw } from 'lucide-react';

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
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [routesRes, driversRes] = await Promise.all([
        fetch('/api/routes'),
        fetch('/api/live-drivers')
      ]);

      let routesData = [];
      if (routesRes.ok) {
        routesData = await routesRes.json();
        setRoutes(routesData || []);
        if (routesData.length > 0 && !selectedRouteId) {
          setSelectedRouteId(routesData[0].id);
        }
      }

      if (driversRes.ok) {
        const driversData = await driversRes.json();
        setLiveDrivers(driversData || []);
      }
    } catch (e) {
      console.error("Ma'lumotlarni yuklashda xatolik:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Fast real-time polling every 3 seconds for instant capacity and movement updates
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [selectedRouteId]);

  if (loading) {
    return (
      <div className="vehicles-loading-state">
        <Loader2 className="animate-spin" size={28} />
        <p>Avtomobillar ma'lumotlari yuklanmoqda...</p>
      </div>
    );
  }

  const activeRoute = routes.find(r => r.id === selectedRouteId) || routes[0];

  // Calculate detailed vehicle info and arrival ETA for all active drivers on this route
  const activeRouteDrivers = activeRoute
    ? liveDrivers.filter(d => String(d.route_id) === String(activeRoute.id))
    : liveDrivers;

  const stops = activeRoute && Array.isArray(activeRoute.stops) ? activeRoute.stops : [];

  const processedVehicles = activeRouteDrivers.map(driver => {
    let currentStopName = "1-bekat (Bosh bekat)";
    let nextStopName = "";
    let etaMinutes = 3;

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

    return {
      driverId: driver.driver_id,
      driverName: `${driver.name} ${driver.surname}`,
      phone: driver.phone,
      routeId: driver.route_id || activeRoute?.id,
      routeNumber: driver.route_number || activeRoute?.number || "1",
      routeName: driver.route_name || activeRoute?.name || "Marshrut",
      routeColor: driver.route_color || activeRoute?.color || "#0066FF",
      latitude: driver.latitude,
      longitude: driver.longitude,
      speed: driver.speed || 0,
      capacity: driver.capacity || "bosh",
      currentStopName,
      nextStopName,
      etaMinutes
    };
  });

  // Sort: Eng tez kelayotgani birinchi chiqadi tepada!
  processedVehicles.sort((a, b) => a.etaMinutes - b.etaMinutes);

  return (
    <div className="vehicles-page-container">
      {/* Route Switcher Tabs */}
      {routes.length > 0 && (
        <div className="route-switcher-bar">
          {routes.map(r => {
            const isSelected = r.id === activeRoute?.id;
            const routeCount = liveDrivers.filter(d => String(d.route_id) === String(r.id)).length;
            const rColor = r.color && r.color.startsWith('#') ? r.color : '#0066FF';

            return (
              <button
                key={r.id}
                className={`route-tab-pill ${isSelected ? 'active' : ''}`}
                onClick={() => setSelectedRouteId(r.id)}
              >
                <span className="pill-num" style={{ backgroundColor: rColor }}>
                  {r.number}
                </span>
                <span className="pill-name">{r.name}</span>
                <span className={`pill-badge ${routeCount > 0 ? 'active' : ''}`}>
                  {routeCount} ta
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Header Info Banner */}
      <div className="vehicles-section-header">
        <div>
          <h2 className="section-title">
            {activeRoute ? `${activeRoute.name} avtomobillari` : "Liniyadagi avtomobillar"}
          </h2>
          <p className="section-subtitle">
            Eng tez yetib keladigan avtomobillar ketma-ketlikda
          </p>
        </div>
        <div className="vehicles-count-chip">
          <Bus size={15} />
          <span>{processedVehicles.length} ta faol</span>
        </div>
      </div>

      {/* Vehicles List (Sorted by ETA ascending) */}
      {processedVehicles.length > 0 ? (
        <div className="vehicles-list-grid">
          {processedVehicles.map((vehicle, idx) => (
            <VehicleCard
              key={vehicle.driverId || idx}
              rank={idx + 1}
              vehicle={vehicle}
              routeColor={activeRoute?.color && activeRoute.color.startsWith('#') ? activeRoute.color : '#0066FF'}
              onSelectVehicle={(veh) => {
                if (onSelectRoute) {
                  onSelectRoute(veh.routeId);
                }
              }}
            />
          ))}
        </div>
      ) : (
        <div className="vehicles-empty-card">
          <div className="empty-icon-wrap">
            <Bus size={38} color="#94a3b8" />
          </div>
          <h3>Hozirda bu marshrutda faol avtomobillar yo'q</h3>
          <p>
            Haydovchilar liniyaga chiqib, o'z ilovasida joylashuvni yoqishi bilan bu yerda real vaqtda paydo bo'ladi.
          </p>
        </div>
      )}
    </div>
  );
}
