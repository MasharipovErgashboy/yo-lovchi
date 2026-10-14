import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation, Plus, Minus, Compass, X, Flag, Clock, MapPin } from 'lucide-react';

export default function DriverMap({ 
  assignedRoute, 
  driverLocation, 
  navToStartActive = false, 
  onClearNavToStart 
}) {
  const mapContainerRef = useRef(null);
  const mapInstance = useRef(null);
  const driverMarkerRef = useRef(null);
  const routeLayerGroupRef = useRef(null);
  const navLayerGroupRef = useRef(null);

  const [navInfo, setNavInfo] = useState(null);
  const [loadingNav, setLoadingNav] = useState(false);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstance.current) return;

    // Default center (Andijon)
    const defaultCenter = [40.7821, 72.3442];
    const map = L.map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: 14,
      zoomControl: false,
      attributionControl: false
    });

    // Clean Google Maps raster tiles
    L.tileLayer('https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=uz', {
      subdomains: ['0', '1', '2', '3'],
      maxZoom: 20
    }).addTo(map);

    routeLayerGroupRef.current = L.layerGroup().addTo(map);
    navLayerGroupRef.current = L.layerGroup().addTo(map);
    mapInstance.current = map;

    // Initial resize trigger
    setTimeout(() => {
      try { map.invalidateSize(); } catch (e) {}
    }, 200);

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  // ResizeObserver to ensure map renders smoothly on tab switch
  useEffect(() => {
    if (!mapContainerRef.current) return;
    const ro = new ResizeObserver(() => {
      if (mapInstance.current) {
        try { mapInstance.current.invalidateSize(); } catch (e) {}
      }
    });
    ro.observe(mapContainerRef.current);
    return () => ro.disconnect();
  }, []);

  // Draw Assigned Route Polyline & Stops (passing all stops via OSRM)
  useEffect(() => {
    if (!mapInstance.current || !routeLayerGroupRef.current || !assignedRoute) return;

    const layerGroup = routeLayerGroupRef.current;
    layerGroup.clearLayers();

    const stops = (assignedRoute.stops || []).filter(s => s && s.lat && s.lng);
    const routeColor = assignedRoute.color && assignedRoute.color.startsWith('#') 
      ? assignedRoute.color 
      : '#0066FF';

    const drawRouteOnMap = (pts) => {
      // Glow polyline
      L.polyline(pts, {
        color: routeColor,
        weight: 12,
        opacity: 0.25,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(layerGroup);

      // White outline
      L.polyline(pts, {
        color: '#ffffff',
        weight: 7,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(layerGroup);

      // Main line
      L.polyline(pts, {
        color: routeColor,
        weight: 5,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(layerGroup);

      if (!navToStartActive) {
        try {
          const bounds = L.latLngBounds(pts);
          mapInstance.current.fitBounds(bounds, { padding: [40, 40] });
        } catch (e) {}
      }
    };

    // Draw Stops
    stops.forEach((stop, idx) => {
      const isStart = idx === 0;
      const isEnd = idx === stops.length - 1;
      
      const stopHtml = `
        <div class="driver-stop-pin ${isStart ? 'start' : (isEnd ? 'end' : '')}">
          <div class="driver-stop-dot"></div>
          ${isStart ? '<span class="driver-stop-tag">Bosh bekat</span>' : ''}
        </div>
      `;

      L.marker([Number(stop.lat), Number(stop.lng)], {
        icon: L.divIcon({
          className: 'driver-stop-marker-wrap',
          html: stopHtml,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        }),
        zIndexOffset: isStart || isEnd ? 500 : 100
      })
      .bindPopup(`
        <div style="font-family: sans-serif; font-size: 13px; padding: 4px;">
          <strong>${idx + 1}-bekat: ${stop.name}</strong>
          ${isStart ? '<div style="color: #10B981; font-weight: 700; font-size: 11px;">Bosh bekat</div>' : ''}
          ${isEnd ? '<div style="color: #EF4444; font-weight: 700; font-size: 11px;">Tugash bekati</div>' : ''}
        </div>
      `)
      .addTo(layerGroup);
    });

    // Fetch road geometry via OSRM if multiple stops
    if (stops.length >= 2) {
      const stopsParam = stops.map(s => `${s.lng},${s.lat}`).join(';');
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${stopsParam}?overview=full&geometries=geojson`;

      fetch(osrmUrl)
        .then(res => res.json())
        .then(data => {
          if (data && data.routes && data.routes.length > 0) {
            const coords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
            drawRouteOnMap(coords);
          } else if (Array.isArray(assignedRoute.polyline) && assignedRoute.polyline.length >= 2) {
            drawRouteOnMap(assignedRoute.polyline);
          } else {
            drawRouteOnMap(stops.map(s => [Number(s.lat), Number(s.lng)]));
          }
        })
        .catch(() => {
          if (Array.isArray(assignedRoute.polyline) && assignedRoute.polyline.length >= 2) {
            drawRouteOnMap(assignedRoute.polyline);
          } else {
            drawRouteOnMap(stops.map(s => [Number(s.lat), Number(s.lng)]));
          }
        });
    } else if (Array.isArray(assignedRoute.polyline) && assignedRoute.polyline.length >= 2) {
      drawRouteOnMap(assignedRoute.polyline);
    }

  }, [assignedRoute, navToStartActive]);

  // Update Driver's OWN live location marker (ONLY THIS DRIVER)
  useEffect(() => {
    if (!mapInstance.current) return;
    const map = mapInstance.current;

    if (!driverLocation || !driverLocation.latitude || !driverLocation.longitude) {
      if (driverMarkerRef.current) {
        map.removeLayer(driverMarkerRef.current);
        driverMarkerRef.current = null;
      }
      return;
    }

    const { latitude, longitude, heading = 0 } = driverLocation;

    const selfMarkerHtml = `
      <div class="driver-beacon-wrapper">
        <div class="driver-beacon-wave"></div>
        <div class="driver-beacon-pin" style="transform: rotate(${heading}deg);">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="12 2 19 21 12 17 5 21 12 2"></polygon>
          </svg>
        </div>
      </div>
    `;

    if (!driverMarkerRef.current) {
      driverMarkerRef.current = L.marker([latitude, longitude], {
        icon: L.divIcon({
          className: 'self-driver-marker-wrap',
          html: selfMarkerHtml,
          iconSize: [44, 44],
          iconAnchor: [22, 22]
        }),
        zIndexOffset: 3000
      }).addTo(map);

      if (!navToStartActive) {
        map.setView([latitude, longitude], 15);
      }
    } else {
      driverMarkerRef.current.setLatLng([latitude, longitude]);
      const iconEl = driverMarkerRef.current.getElement();
      if (iconEl) {
        iconEl.innerHTML = selfMarkerHtml;
      }
    }

  }, [driverLocation, navToStartActive]);

  // Navigation Route from Driver's GPS to Bosh Bekat (Triggered by "Ketdik")
  useEffect(() => {
    if (!mapInstance.current || !navLayerGroupRef.current) return;
    const navLayer = navLayerGroupRef.current;
    navLayer.clearLayers();

    if (!navToStartActive || !driverLocation || !assignedRoute) {
      setNavInfo(null);
      return;
    }

    const stops = (assignedRoute.stops || []).filter(s => s && s.lat && s.lng);
    if (stops.length === 0) return;

    const boshBekat = stops[0];
    const driverLat = driverLocation.latitude;
    const driverLng = driverLocation.longitude;
    const startLat = Number(boshBekat.lat);
    const startLng = Number(boshBekat.lng);

    setLoadingNav(true);

    const navOsrmUrl = `https://router.project-osrm.org/route/v1/driving/${driverLng},${driverLat};${startLng},${startLat}?overview=full&geometries=geojson`;

    const drawNavigationLine = (pts, distanceMeters, durationSec) => {
      // Glow
      L.polyline(pts, {
        color: '#4F46E5',
        weight: 12,
        opacity: 0.25,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(navLayer);

      // Dashed navigation line
      L.polyline(pts, {
        color: '#4F46E5',
        weight: 6,
        opacity: 0.95,
        dashArray: '8, 8',
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(navLayer);

      // Destination Bosh Bekat Flag Marker
      const destHtml = `
        <div class="nav-dest-flag-wrap">
          <div class="nav-dest-flag">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#ffffff" stroke="none">
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path>
              <line x1="4" y1="22" x2="4" y2="15" stroke="#ffffff" stroke-width="3"></line>
            </svg>
          </div>
          <span class="nav-dest-label">Bosh bekat</span>
        </div>
      `;

      L.marker([startLat, startLng], {
        icon: L.divIcon({
          className: 'nav-dest-marker',
          html: destHtml,
          iconSize: [32, 32],
          iconAnchor: [16, 28]
        }),
        zIndexOffset: 4000
      }).addTo(navLayer);

      // Fit bounds to show driver and Bosh bekat
      try {
        const bounds = L.latLngBounds([
          [driverLat, driverLng],
          [startLat, startLng],
          ...pts
        ]);
        mapInstance.current.fitBounds(bounds, { padding: [60, 60] });
      } catch (e) {}

      setNavInfo({
        distanceKm: (distanceMeters / 1000).toFixed(1),
        durationMin: Math.max(1, Math.round(durationSec / 60)),
        boshBekatName: boshBekat.name || "Bosh bekat"
      });
      setLoadingNav(false);
    };

    fetch(navOsrmUrl)
      .then(res => res.json())
      .then(data => {
        if (data && data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const coords = route.geometry.coordinates.map(c => [c[1], c[0]]);
          drawNavigationLine(coords, route.distance, route.duration);
        } else {
          // Fallback straight line
          const pts = [[driverLat, driverLng], [startLat, startLng]];
          drawNavigationLine(pts, 10000, 900);
        }
      })
      .catch(() => {
        const pts = [[driverLat, driverLng], [startLat, startLng]];
        drawNavigationLine(pts, 10000, 900);
      });

  }, [navToStartActive, driverLocation, assignedRoute]);

  const handleCenterOnMe = () => {
    if (mapInstance.current && driverLocation && driverLocation.latitude) {
      mapInstance.current.setView([driverLocation.latitude, driverLocation.longitude], 16, { animate: true });
    }
  };

  const handleResetRouteView = () => {
    if (mapInstance.current && assignedRoute) {
      const stops = (assignedRoute.stops || []).filter(s => s && s.lat && s.lng);
      if (stops.length > 0) {
        const bounds = L.latLngBounds(stops.map(s => [Number(s.lat), Number(s.lng)]));
        mapInstance.current.fitBounds(bounds, { padding: [40, 40] });
      }
    }
  };

  return (
    <div className="driver-fullmap-container">
      <div ref={mapContainerRef} className="driver-fullmap-canvas" />

      {/* Route Badge Top Pill */}
      {assignedRoute && (
        <div className="driver-route-top-pill">
          <div 
            className="driver-route-num-badge" 
            style={{ backgroundColor: assignedRoute.color && assignedRoute.color.startsWith('#') ? assignedRoute.color : '#0066FF' }}
          >
            {assignedRoute.number}
          </div>
          <div className="driver-route-top-text">
            <span className="driver-route-top-title">{assignedRoute.name}</span>
            <span className="driver-route-top-sub">{assignedRoute.direction || 'Marshrut yo\'nalishi'}</span>
          </div>
        </div>
      )}

      {/* Navigation Banner (When "Ketdik" is activated) */}
      {navToStartActive && (
        <div className="driver-nav-banner">
          <div className="nav-banner-icon">
            <Navigation size={18} color="#ffffff" style={{ transform: 'rotate(45deg)' }} />
          </div>
          <div className="nav-banner-info">
            <div className="nav-banner-title">
              Bosh bekatga yo'nalish
              {loadingNav && <span className="nav-loading"> (hisoblanmoqda...)</span>}
            </div>
            {navInfo && (
              <div className="nav-banner-stats">
                <span className="nav-stat-val">{navInfo.distanceKm} km</span>
                <span className="nav-stat-dot">•</span>
                <span className="nav-stat-time">~{navInfo.durationMin} daqiqa</span>
                <span className="nav-stat-dot">•</span>
                <span className="nav-stat-dest">{navInfo.boshBekatName}</span>
              </div>
            )}
          </div>
          <button 
            className="nav-banner-close-btn" 
            onClick={() => onClearNavToStart && onClearNavToStart()}
            title="Yo'nalishni yopish"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Floating Action Controls on Right */}
      <div className="driver-map-action-controls">
        <button className="driver-fab-btn" onClick={handleCenterOnMe} title="Mening joylashuvim">
          <Navigation size={18} color="#0066FF" />
        </button>
        <button className="driver-fab-btn" onClick={handleResetRouteView} title="Marshrutni ko'rish">
          <Compass size={18} color="#0f172a" />
        </button>
        <div className="driver-fab-zoom-group">
          <button className="driver-fab-btn zoom" onClick={() => mapInstance.current?.zoomIn()} title="Kattalashtirish (+)">
            <Plus size={16} />
          </button>
          <button className="driver-fab-btn zoom" onClick={() => mapInstance.current?.zoomOut()} title="Kichiklashtirish (-)">
            <Minus size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
