import React, { useState, useEffect } from 'react';
import RouteCard from './RouteCard';
import { Loader2, Navigation } from 'lucide-react';

export default function RouteList({ onSelectRoute }) {
  const [routes, setRoutes] = useState([]);
  const [liveDrivers, setLiveDrivers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [routesRes, driversRes] = await Promise.all([
        fetch('/api/routes'),
        fetch('/api/live-drivers')
      ]);

      if (routesRes.ok) {
        const routesData = await routesRes.json();
        setRoutes(routesData || []);
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
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
        <Loader2 className="animate-spin" size={28} style={{ margin: '0 auto 12px' }} />
        <p>Marshrutlar yuklanmoqda...</p>
      </div>
    );
  }

  if (routes.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 20px', background: 'var(--white)', borderRadius: '16px' }}>
        <Navigation size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
        <h3>Hozircha marshrutlar mavjud emas</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '6px' }}>
          Tez orada yangi marshrutlar qo'shiladi.
        </p>
      </div>
    );
  }

  return (
    <div className="route-list">
      {routes.map(route => {
        // Find active drivers on this route
        const routeDrivers = liveDrivers.filter(d => String(d.route_id) === String(route.id));
        const activeBusesCount = routeDrivers.length;
        const stopsCount = Array.isArray(route.stops) ? route.stops.length : 2;

        // Capacity text from active drivers
        let capacityText = "Bo'sh joy ko'p";
        let capacityPercent = "60-70%";
        if (activeBusesCount > 0) {
          const firstCap = routeDrivers[0].capacity;
          if (firstCap === 'tola') {
            capacityText = "To'la";
            capacityPercent = "90-100%";
          } else if (firstCap === 'ozroq') {
            capacityText = "O'rtacha joy";
            capacityPercent = "40-50%";
          }
        }

        const routeColor = route.color && route.color.startsWith('#') ? route.color : 'var(--blue-primary)';

        return (
          <div 
            key={route.id} 
            onClick={() => onSelectRoute && onSelectRoute(route.id)}
            style={{ cursor: 'pointer' }}
          >
            <RouteCard
              number={route.number}
              color={routeColor}
              name={route.name}
              direction={route.direction}
              eta={activeBusesCount > 0 ? "5" : "—"}
              currentStop={1}
              totalStops={stopsCount}
              capacity={capacityText}
              capacityPercent={capacityPercent}
              activeBuses={activeBusesCount}
            />
          </div>
        );
      })}
    </div>
  );
}
