import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-rotate';
import { Navigation, Plus, Minus, Compass, X, Flag, Clock, MapPin, Maximize, Minimize } from 'lucide-react';

export default function DriverMap({ 
  assignedRoute, 
  driverLocation, 
  locationEnabled = false,
  navToStartActive = false, 
  onClearNavToStart 
}) {
  const mapContainerRef = useRef(null);
  const mapInstance = useRef(null);
  const driverMarkerRef = useRef(null);
  const routeLayerGroupRef = useRef(null);
  const navLayerGroupRef = useRef(null);

  const drawnRouteIdRef = useRef(null);
  const navDrawnKeyRef = useRef(null);
  const userMovedMapRef = useRef(false);

  const [navInfo, setNavInfo] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentBearing, setCurrentBearing] = useState(0);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstance.current) return;

    // Default center (Andijon)
    const defaultCenter = [40.7821, 72.3442];
    const map = L.map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: 14,
      zoomControl: false,
      attributionControl: false,
      rotate: true,
      touchRotate: true,
      rotateControl: false,
      bearing: 0
    });

    // Listen to rotation events to update compass
    map.on('rotate', () => {
      try {
        const b = map.getBearing ? map.getBearing() : 0;
        setCurrentBearing(Math.round(b));
      } catch (e) {}
    });

    // Clean Google Maps raster tiles
    L.tileLayer('https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=uz', {
      subdomains: ['0', '1', '2', '3'],
      maxZoom: 20
    }).addTo(map);

    routeLayerGroupRef.current = L.layerGroup().addTo(map);
    navLayerGroupRef.current = L.layerGroup().addTo(map);
    mapInstance.current = map;

    // Detect user manual interaction (drag, pinch, zoom) to stop resetting their view
    const handleUserInteraction = () => {
      userMovedMapRef.current = true;
      setIsFollowing(false);
    };

    map.on('dragstart', handleUserInteraction);
    map.on('zoomstart', handleUserInteraction);
    map.on('touchstart', handleUserInteraction);

    // Initial resize trigger
    setTimeout(() => {
      try { map.invalidateSize(); } catch (e) {}
    }, 200);

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  // ResizeObserver to ensure map renders smoothly on tab switch and fullscreen
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

  // Draw Assigned Route Polyline & Stops (Runs ONCE per route ID without blinking)
  useEffect(() => {
    if (!mapInstance.current || !routeLayerGroupRef.current || !assignedRoute) return;

    // If already drawn for this route, keep it steady in background
    if (drawnRouteIdRef.current === assignedRoute.id) return;
    drawnRouteIdRef.current = assignedRoute.id;

    const layerGroup = routeLayerGroupRef.current;
    layerGroup.clearLayers();

    const stops = (assignedRoute.stops || [])
      .map((s, idx) => {
        if (!s) return null;
        const lat = s.lat != null ? Number(s.lat) : null;
        const lng = s.lng != null ? Number(s.lng) : null;
        return lat && lng && !isNaN(lat) && !isNaN(lng) 
          ? { name: s.name || `Bekat ${idx + 1}`, lat, lng } 
          : null;
      })
      .filter(Boolean);

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

      // Fit bounds only if nav is not active and user has not interacted
      if (!navToStartActive && !userMovedMapRef.current) {
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

    if (Array.isArray(assignedRoute.polyline) && assignedRoute.polyline.length >= 2) {
      drawRouteOnMap(assignedRoute.polyline);
    } else if (stops.length >= 2) {
      const stopsParam = stops.map(s => `${s.lng},${s.lat}`).join(';');
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${stopsParam}?overview=full&geometries=geojson`;

      fetch(osrmUrl)
        .then(res => res.json())
        .then(data => {
          if (data && data.routes && data.routes.length > 0) {
            const coords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
            drawRouteOnMap(coords);
          } else {
            drawRouteOnMap(stops.map(s => [Number(s.lat), Number(s.lng)]));
          }
        })
        .catch(() => {
          drawRouteOnMap(stops.map(s => [Number(s.lat), Number(s.lng)]));
        });
    }
  }, [assignedRoute, navToStartActive]);

  // Navigation Route from Driver's GPS to Bosh Bekat (Calculated ONCE without 5s refreshes)
  useEffect(() => {
    if (!mapInstance.current || !navLayerGroupRef.current) return;
    const navLayer = navLayerGroupRef.current;

    if (!navToStartActive || !assignedRoute) {
      navLayer.clearLayers();
      setNavInfo(null);
      navDrawnKeyRef.current = null;
      return;
    }

    if (!driverLocation || !driverLocation.latitude || !driverLocation.longitude) return;

    const stops = (assignedRoute.stops || []).filter(s => s && s.lat && s.lng);
    if (stops.length === 0) return;

    const boshBekat = stops[0];
    const driverLat = Number(driverLocation.latitude);
    const driverLng = Number(driverLocation.longitude);
    const startLat = Number(boshBekat.lat);
    const startLng = Number(boshBekat.lng);

    const navKey = `${assignedRoute.id}_${startLat.toFixed(4)}_${startLng.toFixed(4)}`;
    if (navDrawnKeyRef.current === navKey) {
      // Route already drawn! Keep it steady without re-fetching or blinking
      return;
    }
    navDrawnKeyRef.current = navKey;

    const navOsrmUrl = `https://router.project-osrm.org/route/v1/driving/${driverLng},${driverLat};${startLng},${startLat}?overview=full&geometries=geojson`;

    const drawNavigationLine = (pts, distanceMeters, durationSec) => {
      navLayer.clearLayers();

      // Glow
      L.polyline(pts, {
        color: '#2563EB',
        weight: 12,
        opacity: 0.25,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(navLayer);

      // White outline
      L.polyline(pts, {
        color: '#ffffff',
        weight: 7,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(navLayer);

      // Dashed navigation line
      L.polyline(pts, {
        color: '#2563EB',
        weight: 5,
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
          iconSize: [36, 36],
          iconAnchor: [18, 30]
        }),
        zIndexOffset: 4000
      }).addTo(navLayer);

      // Initial fit bounds only if user hasn't moved the map
      if (!userMovedMapRef.current) {
        try {
          const bounds = L.latLngBounds([
            [driverLat, driverLng],
            [startLat, startLng],
            ...pts
          ]);
          mapInstance.current.fitBounds(bounds, { padding: [60, 60] });
        } catch (e) {}
      }

      setNavInfo({
        distanceKm: (distanceMeters / 1000).toFixed(1),
        durationMin: Math.max(1, Math.round(durationSec / 60)),
        boshBekatName: boshBekat.name || "Bosh bekat"
      });
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

  }, [navToStartActive, assignedRoute]);

  // Update Driver's OWN live location marker & smooth follow
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
    } else {
      driverMarkerRef.current.setLatLng([latitude, longitude]);
      const iconEl = driverMarkerRef.current.getElement();
      if (iconEl) {
        iconEl.innerHTML = selfMarkerHtml;
      }
    }

    // Follow Mode: Keep vehicle centered smoothly while moving
    if (isFollowing) {
      map.panTo([latitude, longitude], { animate: true, duration: 0.8 });
    }

  }, [driverLocation, isFollowing]);

  // "Ketdik" Button: centers and locks zoom on vehicle during travel
  const handleToggleFollow = () => {
    setIsFollowing(true);
    userMovedMapRef.current = false;

    if (driverLocation && driverLocation.latitude && driverLocation.longitude) {
      if (mapInstance.current) {
        mapInstance.current.setView([driverLocation.latitude, driverLocation.longitude], 17, { animate: true });
      }
    } else if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (mapInstance.current) {
            mapInstance.current.setView([pos.coords.latitude, pos.coords.longitude], 17, { animate: true });
          }
        },
        () => {},
        { enableHighAccuracy: true }
      );
    }
  };

  const handleCenterOnMe = () => {
    userMovedMapRef.current = false;
    if (mapInstance.current && driverLocation && driverLocation.latitude) {
      mapInstance.current.setView([driverLocation.latitude, driverLocation.longitude], 16, { animate: true });
    }
  };

  const handleResetRouteView = () => {
    userMovedMapRef.current = false;
    setIsFollowing(false);
    if (mapInstance.current) {
      if (typeof mapInstance.current.setBearing === 'function') {
        mapInstance.current.setBearing(0);
        setCurrentBearing(0);
      }
      if (assignedRoute) {
        const stops = (assignedRoute.stops || []).filter(s => s && s.lat && s.lng);
        if (stops.length > 0) {
          const bounds = L.latLngBounds(stops.map(s => [Number(s.lat), Number(s.lng)]));
          mapInstance.current.fitBounds(bounds, { padding: [40, 40] });
        }
      }
    }
  };

  const handleToggleFullscreen = () => {
    setIsFullscreen(prev => {
      const next = !prev;
      setTimeout(() => {
        if (mapInstance.current) {
          mapInstance.current.invalidateSize();
        }
      }, 200);
      return next;
    });
  };

  return (
    <div className={`driver-fullmap-container ${isFullscreen ? 'is-fullscreen' : ''}`}>
      <div ref={mapContainerRef} className="driver-fullmap-canvas" />

      {/* Route Badge Top Pill */}
      {!navToStartActive && assignedRoute && (
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

      {/* Navigation Banner (When "Ketdik" is activated - NO "hisoblanmoqda..." text) */}
      {navToStartActive && (
        <div className="driver-nav-banner">
          <div className="nav-banner-icon">
            <Navigation size={18} color="#ffffff" style={{ transform: 'rotate(45deg)' }} />
          </div>
          <div className="nav-banner-info">
            <div className="nav-banner-title">
              Bosh bekatga yo'nalish
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
      <div className={`driver-map-action-controls ${(navToStartActive || locationEnabled) ? 'has-bottom-btn' : ''}`}>
        <button 
          className="driver-fab-btn" 
          onClick={handleToggleFullscreen} 
          title={isFullscreen ? "Kichiklashtirish" : "To'liq ekran"}
        >
          {isFullscreen ? <Minimize size={18} color="#0f172a" /> : <Maximize size={18} color="#0f172a" />}
        </button>
        <button className="driver-fab-btn" onClick={handleCenterOnMe} title="Mening joylashuvim">
          <Navigation size={18} color="#0066FF" />
        </button>
        <button 
          className="driver-fab-btn" 
          onClick={handleResetRouteView} 
          title="Marshrutni ko'rish / Shimolga burish"
        >
          <Compass 
            size={18} 
            color={currentBearing !== 0 ? "#2563EB" : "#0f172a"} 
            style={{ 
              transform: `rotate(${-currentBearing}deg)`,
              transition: 'transform 0.2s ease'
            }} 
          />
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

      {/* Bottom Floating Ketdik Button: show when on route with location on OR navigating to start */}
      {(navToStartActive || locationEnabled) && (
        <div className="driver-map-bottom-bar">
          <button 
            type="button"
            className={`driver-ketdik-btn ${isFollowing ? 'is-following' : ''}`}
            onClick={handleToggleFollow}
          >
            <Navigation size={18} fill="currentColor" style={{ transform: 'rotate(45deg)' }} />
            <span>{isFollowing ? "Kuzatilmoqda (Harakatda)" : "Ketdik"}</span>
            {isFollowing && <span className="driver-ketdik-live-badge">Jonli</span>}
          </button>
        </div>
      )}
    </div>
  );
}
