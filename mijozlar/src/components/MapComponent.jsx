import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { Navigation, Compass, RefreshCw, Car, MapPin, Users, Info, ChevronRight, Layers } from 'lucide-react';
import './MapComponent.css';

const GOOGLE_MAPS_API_KEY = "AIzaSyCw1jWX6CDp44r2sSqzeuQjH9PuR_DO-jU";

// Custom dark/clean map style
const MAP_STYLES = [
  {
    "featureType": "transit.station.bus",
    "stylers": [{ "visibility": "on" }]
  },
  {
    "featureType": "poi",
    "elementType": "labels",
    "stylers": [{ "visibility": "off" }]
  }
];

export default function MapComponent({ onSelectRoute, initialRouteId = null }) {
  const mapRef = useRef(null);
  const googleMapInstance = useRef(null);
  const polylinesRef = useRef({});
  const stopMarkersRef = useRef({});
  const carMarkersRef = useRef({});
  const infoWindowRef = useRef(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [selectedRouteId, setSelectedRouteId] = useState(initialRouteId || 'all');
  const [liveDrivers, setLiveDrivers] = useState([]);
  const [activeDriverCount, setActiveDriverCount] = useState(0);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [userLocation, setUserLocation] = useState(null);

  // 1. Load Google Maps JS API
  useEffect(() => {
    // Listen for Google Maps auth errors (e.g. invalid key, billing, or referrer error)
    window.gm_authFailure = () => {
      console.error("Google Maps authentication failed");
      setMapError("Google Maps ruxsatida xatolik yuz berdi. Iltimos, Google Cloud-da 'Maps JavaScript API' yoqilganligini va to'lov hisobi (Billing) ulanganligini tekshiring.");
    };

    const loader = new Loader({
      apiKey: GOOGLE_MAPS_API_KEY,
      version: "weekly"
    });

    loader.load().then((google) => {
      if (!mapRef.current) return;

      // Default center: Andijon / Uzbekistan center (40.7821, 72.3442)
      const map = new google.maps.Map(mapRef.current, {
        center: { lat: 40.7821, lng: 72.3442 },
        zoom: 13,
        mapTypeId: 'roadmap',
        disableDefaultUI: true,
        zoomControl: true,
        zoomControlOptions: {
          position: google.maps.ControlPosition.RIGHT_BOTTOM
        },
        styles: MAP_STYLES
      });

      infoWindowRef.current = new google.maps.InfoWindow();
      googleMapInstance.current = map;
      setMapLoaded(true);
    }).catch(err => {
      console.error("Google Maps yuklashda xatolik:", err);
      setMapError("Google Maps yuklanmadi. Iltimos, internet yoki API sozlamalarini tekshiring.");
    });

    return () => {
      // Cleanup markers
      clearAllMarkers();
    };
  }, []);

  const clearAllMarkers = () => {
    Object.values(polylinesRef.current).forEach(p => p.setMap(null));
    polylinesRef.current = {};

    Object.values(stopMarkersRef.current).forEach(stops => {
      stops.forEach(m => m.setMap(null));
    });
    stopMarkersRef.current = {};

    Object.values(carMarkersRef.current).forEach(m => m.setMap(null));
    carMarkersRef.current = {};
  };

  // 2. Fetch routes from backend
  const fetchRoutes = async () => {
    try {
      const res = await fetch('/api/routes');
      if (res.ok) {
        const data = await res.json();
        setRoutes(data || []);
      }
    } catch (e) {
      console.error("Fetch routes error:", e);
    }
  };

  // 3. Fetch live active drivers
  const fetchLiveDrivers = async () => {
    try {
      const res = await fetch('/api/live-drivers');
      if (res.ok) {
        const drivers = await res.json();
        setLiveDrivers(drivers || []);
        setActiveDriverCount((drivers || []).length);
      }
    } catch (e) {
      console.error("Fetch live drivers error:", e);
    }
  };

  useEffect(() => {
    fetchRoutes();
    fetchLiveDrivers();

    // 4 soniyada bir jonli avtomobillar joylashuvini yangilash
    const interval = setInterval(fetchLiveDrivers, 4000);
    return () => clearInterval(interval);
  }, []);

  // 4. Render Polylines and Stop Markers when routes or selectedRouteId changes
  useEffect(() => {
    if (!mapLoaded || !googleMapInstance.current || routes.length === 0) return;
    const google = window.google;
    const map = googleMapInstance.current;

    // Clear previous polylines & stops
    Object.values(polylinesRef.current).forEach(p => p.setMap(null));
    polylinesRef.current = {};

    Object.values(stopMarkersRef.current).forEach(stops => {
      stops.forEach(m => m.setMap(null));
    });
    stopMarkersRef.current = {};

    const bounds = new google.maps.LatLngBounds();
    let hasCoords = false;

    const routesToDisplay = selectedRouteId === 'all' 
      ? routes 
      : routes.filter(r => String(r.id) === String(selectedRouteId));

    routesToDisplay.forEach(route => {
      const routeColor = route.color && route.color.startsWith('#') ? route.color : '#2563eb';
      const polyPoints = [];

      // Add stops markers
      const routeStopMarkers = [];
      if (Array.isArray(route.stops)) {
        route.stops.forEach((stop, index) => {
          if (stop && typeof stop.lat === 'number' && typeof stop.lng === 'number') {
            const pos = { lat: stop.lat, lng: stop.lng };
            polyPoints.push(pos);
            bounds.extend(pos);
            hasCoords = true;

            const isFirst = index === 0;
            const isLast = index === route.stops.length - 1;

            // Custom stop icon
            const stopIcon = {
              path: google.maps.SymbolPath.CIRCLE,
              fillColor: isFirst ? '#10b981' : isLast ? '#ef4444' : '#ffffff',
              fillOpacity: 1,
              strokeColor: routeColor,
              strokeWeight: 3,
              scale: isFirst || isLast ? 8 : 6
            };

            const marker = new google.maps.Marker({
              position: pos,
              map: map,
              icon: stopIcon,
              title: `${route.number}-marshrut: ${stop.name || `Bekat ${index + 1}`}`,
              zIndex: 10
            });

            marker.addListener('click', () => {
              infoWindowRef.current.setContent(`
                <div style="padding: 8px 12px; font-family: sans-serif; font-size: 13px;">
                  <strong style="color: ${routeColor}; font-size: 14px;">${route.number}-marshrut</strong>
                  <div style="font-weight: 600; margin-top: 4px;">${stop.name || `Bekat ${index + 1}`}</div>
                  <div style="color: #64748b; font-size: 11px; margin-top: 2px;">
                    ${isFirst ? '🟢 Bosh bekat' : isLast ? '🔴 Oxirgi bekat' : '🚏 Oraliq bekat'}
                  </div>
                </div>
              `);
              infoWindowRef.current.open(map, marker);
            });

            routeStopMarkers.push(marker);
          }
        });
      }

      stopMarkersRef.current[route.id] = routeStopMarkers;

      // Polyline (if polyline array provided, use that; otherwise fallback to stop coordinates)
      let lineCoordinates = [];
      if (Array.isArray(route.polyline) && route.polyline.length > 0) {
        lineCoordinates = route.polyline.map(pt => ({ lat: pt[0], lng: pt[1] }));
        lineCoordinates.forEach(pt => {
          bounds.extend(pt);
          hasCoords = true;
        });
      } else {
        lineCoordinates = polyPoints;
      }

      if (lineCoordinates.length >= 2) {
        const polyline = new google.maps.Polyline({
          path: lineCoordinates,
          geodesic: true,
          strokeColor: routeColor,
          strokeOpacity: 0.85,
          strokeWeight: selectedRouteId === String(route.id) ? 6 : 4,
          map: map,
          zIndex: 5
        });

        polylinesRef.current[route.id] = polyline;
      }
    });

    // Fit map bounds to show route
    if (hasCoords) {
      map.fitBounds(bounds, { top: 50, bottom: 80, left: 30, right: 30 });
      if (map.getZoom() > 16) map.setZoom(15);
    }
  }, [mapLoaded, routes, selectedRouteId]);

  // 5. Render / Update Live Car Markers for drivers
  useEffect(() => {
    if (!mapLoaded || !googleMapInstance.current) return;
    const google = window.google;
    const map = googleMapInstance.current;

    const filteredDrivers = selectedRouteId === 'all'
      ? liveDrivers
      : liveDrivers.filter(d => String(d.route_id) === String(selectedRouteId));

    const currentDriverIds = new Set(filteredDrivers.map(d => d.driver_id));

    // Remove cars that went offline or switched route filter
    Object.keys(carMarkersRef.current).forEach(id => {
      if (!currentDriverIds.has(Number(id))) {
        carMarkersRef.current[id].setMap(null);
        delete carMarkersRef.current[id];
      }
    });

    // Update or create car markers
    filteredDrivers.forEach(driver => {
      const pos = { lat: driver.latitude, lng: driver.longitude };
      const routeColor = driver.route_color && driver.route_color.startsWith('#') ? driver.route_color : '#3b82f6';
      const routeNum = driver.route_number || '';

      // Custom Car SVG Icon
      const carSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44">
          <circle cx="22" cy="22" r="20" fill="${routeColor}" stroke="#ffffff" stroke-width="3" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.3))"/>
          <text x="22" y="15" fill="#ffffff" font-size="10" font-weight="bold" font-family="sans-serif" text-anchor="middle">${routeNum}</text>
          <path d="M15 26l7-10 7 10H15z" fill="#ffffff"/>
        </svg>
      `;

      const carIcon = {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(carSvg),
        scaledSize: new google.maps.Size(44, 44),
        anchor: new google.maps.Point(22, 22)
      };

      if (carMarkersRef.current[driver.driver_id]) {
        // Smoothly update position
        const existingMarker = carMarkersRef.current[driver.driver_id];
        existingMarker.setPosition(pos);
        existingMarker.setIcon(carIcon);
      } else {
        // Create new car marker
        const carMarker = new google.maps.Marker({
          position: pos,
          map: map,
          icon: carIcon,
          title: `${driver.name} ${driver.surname} (${routeNum}-marshrut)`,
          zIndex: 100
        });

        carMarker.addListener('click', () => {
          setSelectedDriver(driver);
          infoWindowRef.current.setContent(`
            <div style="padding: 10px 14px; font-family: sans-serif; font-size: 13px; line-height: 1.4;">
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
                <span style="background: ${routeColor}; color: #fff; padding: 2px 8px; border-radius: 6px; font-weight: bold; font-size: 12px;">
                  ${driver.route_number || 'Avtobus'}
                </span>
                <strong style="font-size: 14px;">${driver.name} ${driver.surname}</strong>
              </div>
              <div style="color: #64748b; font-size: 12px;">
                Holati: <strong style="color: #10b981;">${driver.capacity === 'bosh' ? "Bo'sh joy ko'p" : driver.capacity === 'ozroq' ? "O'rtacha joy" : "To'la"}</strong>
              </div>
              <div style="color: #64748b; font-size: 12px; margin-top: 2px;">
                Tezlik: <strong>${Math.round(driver.speed || 0)} km/s</strong>
              </div>
            </div>
          `);
          infoWindowRef.current.open(map, carMarker);
        });

        carMarkersRef.current[driver.driver_id] = carMarker;
      }
    });
  }, [mapLoaded, liveDrivers, selectedRouteId]);

  // Center map on user's current GPS location
  const handleLocateMe = () => {
    if ("geolocation" in navigator && googleMapInstance.current) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const userPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLocation(userPos);
          googleMapInstance.current.setCenter(userPos);
          googleMapInstance.current.setZoom(16);

          // User marker
          new window.google.maps.Marker({
            position: userPos,
            map: googleMapInstance.current,
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              fillColor: '#3b82f6',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 3,
              scale: 8
            },
            title: "Sizning joylashuvingiz",
            zIndex: 200
          });
        },
        (err) => {
          alert("Joylashuvingizni aniqlab bo'lmadi: " + err.message);
        }
      );
    }
  };

  return (
    <div className="map-wrapper">
      {/* Route Filter Pills Bar */}
      <div className="route-filter-bar">
        <button
          className={`route-filter-pill ${selectedRouteId === 'all' ? 'active' : ''}`}
          onClick={() => setSelectedRouteId('all')}
        >
          <Layers size={14} /> Barcha marshrutlar
        </button>
        {routes.map(r => {
          const pillColor = r.color && r.color.startsWith('#') ? r.color : '#3b82f6';
          const isActive = selectedRouteId === String(r.id);
          return (
            <button
              key={r.id}
              className={`route-filter-pill ${isActive ? 'active' : ''}`}
              style={{
                borderColor: isActive ? pillColor : 'rgba(0,0,0,0.08)',
                backgroundColor: isActive ? pillColor : '#ffffff',
                color: isActive ? '#ffffff' : 'var(--text-primary)'
              }}
              onClick={() => setSelectedRouteId(String(r.id))}
            >
              <span className="pill-badge" style={{ backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : pillColor, color: '#fff' }}>
                {r.number}
              </span>
              {r.number}-marshrut
            </button>
          );
        })}
      </div>

      {/* Map Canvas */}
      <div 
        ref={mapRef} 
        className="google-map-canvas" 
        style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }} 
      />

      {!mapLoaded && !mapError && (
        <div className="map-loading">
          <RefreshCw size={28} className="animate-spin" color="#3b82f6" />
          <span>Xarita yuklanmoqda...</span>
        </div>
      )}
      {mapError && (
        <div className="map-error">
          <Info size={32} color="#ef4444" />
          <p style={{ maxWidth: '340px', lineHeight: 1.5 }}>{mapError}</p>
        </div>
      )}

      {/* Floating Status Bar */}
      <div className="map-floating-status">
        <div className="status-badge-live">
          <span className="live-dot animate-pulse"></span>
          <span>{activeDriverCount} ta avtomobil qatnovda</span>
        </div>

        <button 
          className="locate-me-btn" 
          onClick={handleLocateMe}
          title="Mening joylashuvim"
        >
          <Navigation size={18} />
        </button>
      </div>

      {/* Selected Driver Quick Card (Bottom Sheet Preview) */}
      {selectedDriver && (
        <div className="driver-popup-card">
          <div className="driver-popup-header">
            <div className="driver-avatar-circle" style={{ backgroundColor: selectedDriver.route_color || '#3b82f6' }}>
              <Car size={18} color="#fff" />
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: 0, fontSize: '15px' }}>{selectedDriver.name} {selectedDriver.surname}</h4>
              <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                {selectedDriver.route_number}-marshrut haydovchisi
              </div>
            </div>
            <button 
              className="close-popup-btn"
              onClick={() => setSelectedDriver(null)}
            >
              ✕
            </button>
          </div>

          <div className="driver-popup-stats">
            <div className="stat-pill">
              <Users size={14} color="#10b981" />
              <span>{selectedDriver.capacity === 'bosh' ? "Bo'sh joy ko'p" : selectedDriver.capacity === 'ozroq' ? "O'rtacha" : "To'la"}</span>
            </div>
            <div className="stat-pill">
              <Compass size={14} color="#3b82f6" />
              <span>{Math.round(selectedDriver.speed || 0)} km/soat</span>
            </div>
            <a href={`tel:${selectedDriver.phone}`} className="call-driver-btn">
              Qo'ng'iroq
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
