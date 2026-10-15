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

  const activeRoute = routes[0];

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

    return {
      driverId: driver.driver_id,
      driverName: `${driver.name} ${driver.surname || ''}`,
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
      etaMinutes
    };
  });

  // Sort: Eng tez kelayotgani birinchi chiqadi tepada!
  processedVehicles.sort((a, b) => a.etaMinutes - b.etaMinutes);

  return (
    <div className="vehicles-page-container">
      {/* Vehicles List (Sorted by ETA ascending) */}
      {processedVehicles.length > 0 ? (
        <div className="vehicles-list-grid">
          {processedVehicles.map((vehicle, idx) => (
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
