import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Bus, 
  MapPin, 
  Users, 
  Clock, 
  ArrowLeftRight, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  ChevronUp,
  Navigation, 
  Layers, 
  Compass, 
  Plus,
  Minus,
  X,
  Loader2
} from 'lucide-react';
import './MapComponent.css';

// Clean, high-resolution Map Tile Providers (100% Free of any API Key watermarks)
const MAP_LAYERS = {
  google: {
    name: "Google Xarita",
    url: 'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=uz',
    subdomains: ['0', '1', '2', '3'],
    maxZoom: 20
  },
  satellite: {
    name: "Google Yo'ldosh",
    url: 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}&hl=uz',
    subdomains: ['0', '1', '2', '3'],
    maxZoom: 20
  },
  osm: {
    name: "OpenStreetMap",
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    subdomains: ['a', 'b', 'c'],
    maxZoom: 19
  }
};

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

// Determines whether driver is "ketmoqda" (from start point to end) or "kelmoqda" (from end to start)
function determineDriverDirection(driver, prevDriverState, polyPoints, fallbackIndex = 0) {
  const lat = Number(driver.latitude);
  const lng = Number(driver.longitude);
  const heading = Number(driver.heading);

  const routeBearing = getRouteSegmentBearing(lat, lng, polyPoints);

  // 1. Check movement vector if previous coordinates exist and driver moved >= 2 meters
  if (prevDriverState && prevDriverState.prevLat && prevDriverState.prevLng) {
    const distMoved = getDistanceMeters(prevDriverState.prevLat, prevDriverState.prevLng, lat, lng);
    if (distMoved >= 2 && routeBearing !== null) {
      const moveBearing = getBearing(prevDriverState.prevLat, prevDriverState.prevLng, lat, lng);
      let diff = Math.abs(moveBearing - routeBearing) % 360;
      if (diff > 180) diff = 360 - diff;
      return diff < 90 ? 'ketmoqda' : 'kelmoqda';
    }
  }

  // 2. Check GPS heading from mobile sensor
  if (heading && !isNaN(heading) && (driver.speed > 1 || heading > 0) && routeBearing !== null) {
    let diff = Math.abs(heading - routeBearing) % 360;
    if (diff > 180) diff = 360 - diff;
    return diff < 90 ? 'ketmoqda' : 'kelmoqda';
  }

  // 3. Keep previous direction if already identified
  if (prevDriverState && prevDriverState.direction) {
    return prevDriverState.direction;
  }

  // 4. Position-based check: closer to start point = 'ketmoqda', closer to end point = 'kelmoqda'
  if (polyPoints && polyPoints.length >= 2) {
    const distToStart = getDistanceMeters(lat, lng, polyPoints[0][0], polyPoints[0][1]);
    const distToEnd = getDistanceMeters(lat, lng, polyPoints[polyPoints.length - 1][0], polyPoints[polyPoints.length - 1][1]);
    return distToStart <= distToEnd ? 'ketmoqda' : 'kelmoqda';
  }

  return fallbackIndex % 2 === 0 ? 'ketmoqda' : 'kelmoqda';
}

export default function MapComponent({ initialRouteId = null, onBackToRoutes }) {
  const mapContainerRef = useRef(null);
  const mapInstance = useRef(null);
  const routeLayerGroupRef = useRef(null);
  const busLayerGroupRef = useRef(null);
  const busMarkersRef = useRef({});
  const tileLayerRef = useRef(null);

  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [directionReversed, setDirectionReversed] = useState(false);
  const [liveDrivers, setLiveDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentStopIndex, setCurrentStopIndex] = useState(2); // e.g. 5-bekat (hozir)
  const [activeLayer, setActiveLayer] = useState('google');
  const [toastMessage, setToastMessage] = useState(null);
  const [isSheetCollapsed, setIsSheetCollapsed] = useState(true);
  const [collapsedHeight, setCollapsedHeight] = useState(96);
  const [expandedHeight, setExpandedHeight] = useState(280);
  const sheetRef = useRef(null);
  const lastFittedRouteId = useRef(null);
  const userHasMovedMap = useRef(false);

  // Parse polyline points of selected route for direction calculation
  const routePolyPoints = React.useMemo(() => {
    if (!selectedRoute) return [];
    if (Array.isArray(selectedRoute.polyline) && selectedRoute.polyline.length >= 2) {
      return selectedRoute.polyline.map(p => [p[0], p[1]]);
    }
    if (Array.isArray(selectedRoute.stops)) {
      return selectedRoute.stops
        .filter(s => s && typeof s.lat === 'number' && typeof s.lng === 'number')
        .map(s => [s.lat, s.lng]);
    }
    return [];
  }, [selectedRoute]);

  // Measure bottom sheet dynamically to anchor controls smoothly above it
  useEffect(() => {
    const el = sheetRef.current;
    if (!el) return;

    const measure = () => {
      if (sheetRef.current) {
        const h = sheetRef.current.offsetHeight;
        if (h > 0) {
          if (isSheetCollapsed) {
            setCollapsedHeight(h);
          } else {
            setExpandedHeight(h);
          }
        }
      }
    };

    measure();

    let ro = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        measure();
      });
      ro.observe(el);
    }

    const t = setTimeout(measure, 100);

    return () => {
      if (ro) ro.disconnect();
      clearTimeout(t);
    };
  }, [selectedRoute, isSheetCollapsed]);

  // Fetch routes from backend
  const fetchRoutes = async () => {
    try {
      const rRes = await fetch('/api/routes');
      if (rRes.ok) {
        const routesData = await rRes.json();
        setRoutes(routesData || []);
        if (routesData && routesData.length > 0) {
          const found = initialRouteId 
            ? routesData.find(r => String(r.id) === String(initialRouteId)) 
            : routesData[0];
          setSelectedRoute(prev => prev || found || routesData[0]);
        }
      }
    } catch (e) {
      console.error("Map routes fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  // Ultra-fast real-time live drivers fetcher (no caching)
  const fetchLiveDrivers = async () => {
    try {
      const dRes = await fetch('/api/live-drivers', { cache: 'no-store' });
      if (dRes.ok) {
        const driversData = await dRes.json();
        setLiveDrivers(driversData || []);
      }
    } catch (e) {
      // Quiet background failure to avoid interrupting UI
    }
  };

  useEffect(() => {
    fetchRoutes();
    fetchLiveDrivers();
    // Real-time polling every 2 seconds without freezing
    const interval = setInterval(fetchLiveDrivers, 2000);
    return () => clearInterval(interval);
  }, []);

  // Initialize Leaflet Map with Google Maps Tiles
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstance.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [40.7821, 72.3442],
      zoom: 13,
      zoomControl: false,
      attributionControl: false,
      tap: false,
      touchZoom: true,
      bounceAtZoomLimits: false,
      maxZoom: 20,
      minZoom: 6
    });

    const initialLayer = MAP_LAYERS[activeLayer] || MAP_LAYERS.google;
    tileLayerRef.current = L.tileLayer(initialLayer.url, {
      subdomains: initialLayer.subdomains,
      maxZoom: initialLayer.maxZoom
    }).addTo(map);

    routeLayerGroupRef.current = L.layerGroup().addTo(map);
    busLayerGroupRef.current = L.layerGroup().addTo(map);
    mapInstance.current = map;

    map.on('movestart dragstart zoomstart', () => {
      userHasMovedMap.current = true;
    });

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  // Update map tile layer when activeLayer changes
  useEffect(() => {
    if (!mapInstance.current || !tileLayerRef.current) return;
    const layer = MAP_LAYERS[activeLayer] || MAP_LAYERS.google;
    tileLayerRef.current.remove();
    tileLayerRef.current = L.tileLayer(layer.url, {
      subdomains: layer.subdomains,
      maxZoom: layer.maxZoom
    }).addTo(mapInstance.current);
    tileLayerRef.current.bringToBack();
  }, [activeLayer]);

  // Clean up existing bus markers when selected route switches
  useEffect(() => {
    if (busLayerGroupRef.current) {
      busLayerGroupRef.current.clearLayers();
    }
    busMarkersRef.current = {};
  }, [selectedRoute?.id]);

  // 1. Draw route polyline and stops ONLY when route changes or currentStopIndex changes (Runs once per route!)
  useEffect(() => {
    if (!mapInstance.current || !routeLayerGroupRef.current || !selectedRoute) return;

    const layerGroup = routeLayerGroupRef.current;
    layerGroup.clearLayers();

    const routeColor = selectedRoute.color && selectedRoute.color.startsWith('#') 
      ? selectedRoute.color 
      : '#0066FF';

    // Parse stops
    let stops = [];
    if (Array.isArray(selectedRoute.stops) && selectedRoute.stops.length > 0) {
      stops = selectedRoute.stops.map((s, idx) => {
        if (typeof s === 'object') {
          return {
            name: s.name || `Bekat ${idx + 1}`,
            lat: typeof s.lat === 'number' ? s.lat : null,
            lng: typeof s.lng === 'number' ? s.lng : null
          };
        }
        return { name: `Bekat ${idx + 1}`, lat: null, lng: null };
      });
    }

    // Polyline points
    let polyPoints = [];
    if (Array.isArray(selectedRoute.polyline) && selectedRoute.polyline.length >= 2) {
      polyPoints = selectedRoute.polyline.map(p => [p[0], p[1]]);
    } else {
      // Fallback to stop lat/lngs if polyline empty
      polyPoints = stops
        .filter(s => s.lat && s.lng)
        .map(s => [s.lat, s.lng]);
    }

    // Default sample path if no coordinates exist yet
    if (polyPoints.length < 2) {
      polyPoints = [
        [41.3111, 69.2797],
        [41.3350, 69.3200],
        [41.3650, 69.3700],
        [41.3900, 69.4300],
        [41.4200, 69.5000],
        [41.4689, 69.5822]
      ];
      stops = [
        { name: "Do'stlik bekati", lat: 41.3111, lng: 69.2797 },
        { name: "Qiyot bekati", lat: 41.3350, lng: 69.3200 },
        { name: "5-bekat (hozir)", lat: 41.3650, lng: 69.3700 },
        { name: "6-bekat", lat: 41.3900, lng: 69.4300 },
        { name: "7-bekat", lat: 41.4200, lng: 69.5000 },
        { name: "8-bekat", lat: 41.4689, lng: 69.5822 }
      ];
    }

    // 1. Draw glowing background polyline and main polyline
    L.polyline(polyPoints, {
      color: routeColor,
      weight: 6,
      opacity: 0.9,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(layerGroup);

    // Subtle outline / glow
    L.polyline(polyPoints, {
      color: routeColor,
      weight: 12,
      opacity: 0.25,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(layerGroup);

    // 2. Draw Stop Markers along the line
    stops.forEach((stop, idx) => {
      if (!stop.lat || !stop.lng) return;
      const isCurrentStop = idx === currentStopIndex;

      const stopIconHtml = `
        <div class="custom-stop-marker ${isCurrentStop ? 'is-active-stop' : ''}">
          <div class="stop-dot-inner"></div>
        </div>
      `;

      const stopMarker = L.marker([stop.lat, stop.lng], {
        icon: L.divIcon({
          className: 'stop-marker-wrapper',
          html: stopIconHtml,
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        })
      });

      stopMarker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 13px; font-weight: 600; color: #1e293b; padding: 4px 6px;">
          ${stop.name}
        </div>
      `);

      stopMarker.addTo(layerGroup);
    });

    // Auto-fit bounds ONLY on initial load of this route, never on driver location updates or user pan/zoom!
    if (lastFittedRouteId.current !== selectedRoute.id) {
      lastFittedRouteId.current = selectedRoute.id;
      userHasMovedMap.current = false;
      const bounds = L.latLngBounds(polyPoints);
      mapInstance.current.fitBounds(bounds, {
        paddingTopLeft: [40, 40],
        paddingBottomRight: [40, 260]
      });
    }

  }, [selectedRoute, currentStopIndex]);

  // 2. Real-time Live Drivers Marker Layer (Non-freezing, smooth setLatLng and instant removal)
  useEffect(() => {
    if (!mapInstance.current || !busLayerGroupRef.current || !selectedRoute) return;

    const routeDrivers = (liveDrivers || []).filter(
      d => String(d.route_id) === String(selectedRoute.id) && d.is_online !== false
    );

    const activeIds = new Set(routeDrivers.map(d => String(d.driver_id || d.id)));

    // A. Remove markers for drivers who went offline or left this route
    Object.keys(busMarkersRef.current).forEach(id => {
      if (!activeIds.has(id)) {
        if (busMarkersRef.current[id]?.marker) {
          busMarkersRef.current[id].marker.remove();
        }
        delete busMarkersRef.current[id];
      }
    });

    // B. Smoothly update existing markers or create new ones
    routeDrivers.forEach((driver, dIdx) => {
      const id = String(driver.driver_id || driver.id);
      const lat = Number(driver.latitude);
      const lng = Number(driver.longitude);
      if (!lat || !lng || isNaN(lat) || isNaN(lng)) return;

      const existingState = busMarkersRef.current[id];
      const direction = determineDriverDirection(driver, existingState, routePolyPoints, dIdx);
      const isKetmoqda = direction === 'ketmoqda';
      const busColor = isKetmoqda ? '#0066FF' : '#10B981';
      const dirText = isKetmoqda ? 'Ketmoqda' : 'Kelmoqda';

      let capText = "Bo'sh joy ko'p";
      let capColor = "#10B981";
      if (driver.capacity === 'tola') {
        capText = "To'la";
        capColor = "#EF4444";
      } else if (driver.capacity === 'ozroq') {
        capText = "Ozroq joy bor";
        capColor = "#F59E0B";
      }

      const popupHtml = `
        <div style="font-family: sans-serif; font-size: 13px; padding: 6px;">
          <strong>${driver.name} ${driver.surname || ''}</strong>
          <div style="color: #64748b; font-size: 12px; margin-top: 2px;">
            ${driver.route_number || selectedRoute.number}-marshrut • <strong style="color: ${busColor};">${dirText}</strong>
          </div>
          <div style="color: ${capColor}; font-weight: 700; margin-top: 4px;">
            ${capText}
          </div>
        </div>
      `;

      if (busMarkersRef.current[id]) {
        // Marker already exists -> smoothly update position without re-creating DOM
        const existing = busMarkersRef.current[id];
        existing.marker.setLatLng([lat, lng]);
        if (existing.capacity !== driver.capacity || existing.direction !== direction) {
          existing.marker.setPopupContent(popupHtml);
          existing.capacity = driver.capacity;
          if (existing.direction !== direction) {
            existing.direction = direction;
            existing.marker.setIcon(L.divIcon({
              className: 'bus-marker-wrapper',
              html: `
                <div class="custom-bus-marker ${isKetmoqda ? 'going' : 'returning'}">
                  <div class="bus-circle-icon" style="background: ${busColor}">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M8 6v6"></path>
                      <path d="M15 6v6"></path>
                      <path d="M2 12h19.6"></path>
                      <path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"></path>
                      <circle cx="7" cy="18" r="2"></circle>
                      <circle cx="15" cy="18" r="2"></circle>
                    </svg>
                  </div>
                </div>
              `,
              iconSize: [36, 36],
              iconAnchor: [18, 18]
            }));
          }
        }
        existing.prevLat = lat;
        existing.prevLng = lng;
      } else {
        // Create new marker
        const busIconHtml = `
          <div class="custom-bus-marker ${isKetmoqda ? 'going' : 'returning'}">
            <div class="bus-circle-icon" style="background: ${busColor}">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M8 6v6"></path>
                <path d="M15 6v6"></path>
                <path d="M2 12h19.6"></path>
                <path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"></path>
                <circle cx="7" cy="18" r="2"></circle>
                <circle cx="15" cy="18" r="2"></circle>
              </svg>
            </div>
          </div>
        `;

        const busMarker = L.marker([lat, lng], {
          icon: L.divIcon({
            className: 'bus-marker-wrapper',
            html: busIconHtml,
            iconSize: [36, 36],
            iconAnchor: [18, 18]
          }),
          zIndexOffset: 1000
        });

        busMarker.bindPopup(popupHtml);
        busMarker.addTo(busLayerGroupRef.current);

        busMarkersRef.current[id] = {
          marker: busMarker,
          capacity: driver.capacity,
          direction: direction,
          prevLat: lat,
          prevLng: lng
        };
      }
    });

  }, [liveDrivers, selectedRoute, routePolyPoints]);

  // Center map on user GPS location
  const handleLocateMe = () => {
    if ("geolocation" in navigator && mapInstance.current) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const userLatLng = [pos.coords.latitude, pos.coords.longitude];
          mapInstance.current.setView(userLatLng, 15);
          
          L.circleMarker(userLatLng, {
            radius: 8,
            fillColor: '#0066FF',
            fillOpacity: 1,
            color: '#ffffff',
            weight: 3
          }).addTo(layerGroupRef.current).bindPopup("Siz shu yerdasiz").openPopup();
        },
        (err) => alert("Joylashuvingizni aniqlab bo'lmadi: " + err.message),
        { enableHighAccuracy: true }
      );
    }
  };

  // Toggle route direction
  const handleReverseDirection = () => {
    setDirectionReversed(prev => !prev);
    if (selectedRoute) {
      const parts = (selectedRoute.direction || '').split('→');
      const newDir = parts.length === 2 ? `${parts[1].trim()} → ${parts[0].trim()}` : selectedRoute.direction;
      setSelectedRoute({
        ...selectedRoute,
        direction: newDir
      });
    }
  };

  // Switch between routes if user has multiple routes
  const handleSwitchRoute = () => {
    if (routes.length <= 1) return;
    const currentIndex = routes.findIndex(r => r.id === selectedRoute.id);
    const nextIndex = (currentIndex + 1) % routes.length;
    setSelectedRoute(routes[nextIndex]);
    setToastMessage(`${routes[nextIndex].name} ga o'tildi`);
    setTimeout(() => setToastMessage(null), 2000);
  };

  // Toggle map layers (Google Xarita -> Google Yo'ldosh -> OpenStreetMap)
  const handleToggleLayer = () => {
    const layerKeys = ['google', 'satellite', 'osm'];
    const nextIdx = (layerKeys.indexOf(activeLayer) + 1) % layerKeys.length;
    const nextLayer = layerKeys[nextIdx];
    setActiveLayer(nextLayer);
    setToastMessage(`Qatlam: ${MAP_LAYERS[nextLayer].name}`);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Reset view to fit the route bounds
  const handleResetView = () => {
    if (!mapInstance.current || !selectedRoute) return;
    let polyPoints = [];
    if (Array.isArray(selectedRoute.polyline) && selectedRoute.polyline.length >= 2) {
      polyPoints = selectedRoute.polyline.map(p => [p[0], p[1]]);
    } else if (Array.isArray(selectedRoute.stops)) {
      polyPoints = selectedRoute.stops.filter(s => s.lat && s.lng).map(s => [s.lat, s.lng]);
    }
    if (polyPoints.length > 0) {
      mapInstance.current.fitBounds(L.latLngBounds(polyPoints), {
        paddingTopLeft: [40, 40],
        paddingBottomRight: [40, 260]
      });
      setToastMessage("Marshrut markazlashtirildi");
      setTimeout(() => setToastMessage(null), 2000);
    }
  };

  // Zoom controls
  const handleZoomIn = () => {
    if (mapInstance.current) {
      mapInstance.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapInstance.current) {
      mapInstance.current.zoomOut();
    }
  };

  // Timeline stops
  const currentStops = (selectedRoute && Array.isArray(selectedRoute.stops) && selectedRoute.stops.length > 0)
    ? selectedRoute.stops.map((s, idx) => (typeof s === 'object' ? s.name || `Bekat ${idx + 1}` : String(s)))
    : ["Do'stlik bekati", "Qiyot bekati", "5-bekat (hozir)", "6-bekat", "7-bekat", "8-bekat"];

  // Calculate bottom offset so floating controls are anchored with a clean 20px gap directly above the route card
  const currentSheetH = selectedRoute ? (isSheetCollapsed ? (collapsedHeight || 96) : (expandedHeight || 280)) : 0;
  const floatingBottom = currentSheetH > 0 ? (currentSheetH + 20) : 24;

  return (
    <div className="fullscreen-map-wrapper">
      {/* 1. Leaflet Map Container */}
      <div ref={mapContainerRef} className="map-leaflet-canvas" />

      {/* Floating Mode Toast */}
      {toastMessage && (
        <div className="map-toast-notification">
          {toastMessage}
        </div>
      )}

      {/* 2. Floating Action Controls (Right side - anchored above the bottom sheet) */}
      <div 
        className="floating-map-controls"
        style={{ bottom: `${floatingBottom}px` }}
      >
        <button className="map-ctrl-btn" onClick={handleLocateMe} title="Mening joylashuvim">
          <Navigation size={18} color="#0066FF" />
        </button>

        <div className="zoom-btn-group">
          <button className="map-ctrl-btn zoom-btn" onClick={handleZoomIn} title="Kattalashtirish (+)">
            <Plus size={18} color="#0f172a" />
          </button>
          <button className="map-ctrl-btn zoom-btn" onClick={handleZoomOut} title="Kichiklashtirish (-)">
            <Minus size={18} color="#0f172a" />
          </button>
        </div>

        <button 
          className="map-ctrl-btn" 
          onClick={handleToggleLayer} 
          title="Xarita qatlamini almashtirish (Google / Yo'ldosh / OSM)"
        >
          <Layers size={18} color="#0f172a" />
        </button>

        <button 
          className="map-ctrl-btn" 
          onClick={handleResetView} 
          title="Marshrutni markazlashtirish"
        >
          <Compass size={18} color="#0f172a" />
        </button>
      </div>

      {/* 3. Floating Legend Box (Bottom Left above sheet) */}
      <div 
        className="floating-legend-box"
        style={{ bottom: `${floatingBottom}px` }}
      >
        <div className="legend-row">
          <div className="legend-icon blue">
            <Bus size={14} color="#0066FF" />
            <span className="legend-arrow">➔</span>
          </div>
          <span className="legend-label">Ketmoqda</span>
        </div>
        <div className="legend-row">
          <div className="legend-icon green">
            <Bus size={14} color="#10B981" />
            <span className="legend-arrow">➔</span>
          </div>
          <span className="legend-label">Kelmoqda</span>
        </div>
      </div>

      {/* 4. Bottom Sheet Card (Collapsible) */}
      {selectedRoute && (
        <div ref={sheetRef} className={`map-bottom-sheet ${isSheetCollapsed ? 'is-collapsed' : ''}`}>
          <div 
            className="sheet-drag-handle-wrapper"
            onClick={() => setIsSheetCollapsed(prev => !prev)}
            title={isSheetCollapsed ? "Kengaytirish" : "Yopish"}
          >
            <div className="sheet-drag-handle"></div>
          </div>

          {/* Route Header */}
          <div className="sheet-route-header">
            <div 
              className="sheet-route-badge" 
              style={{ 
                backgroundColor: selectedRoute.color && selectedRoute.color.startsWith('#') ? selectedRoute.color : '#0066FF',
                cursor: routes.length > 1 ? 'pointer' : 'default'
              }}
              onClick={handleSwitchRoute}
              title={routes.length > 1 ? "Boshqa marshrutga o'tish" : ""}
            >
              {selectedRoute.number}
            </div>
            
            <div 
              className="sheet-route-details"
              onClick={() => setIsSheetCollapsed(prev => !prev)}
              style={{ cursor: 'pointer' }}
              title={isSheetCollapsed ? "Kengaytirish" : "Yopish"}
            >
              <h3 className="sheet-route-title">
                {selectedRoute.name}
                {routes.length > 1 && (
                  <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '6px', fontWeight: 500 }}>
                    ({routes.findIndex(r => r.id === selectedRoute.id) + 1}/{routes.length})
                  </span>
                )}
              </h3>
              <p className="sheet-route-direction">{selectedRoute.direction || ''}</p>
            </div>

            <div className="sheet-header-actions">
              <button className="sheet-direction-btn" onClick={handleReverseDirection}>
                <span>Yo'nalish</span>
                <ArrowLeftRight size={14} />
              </button>

              <button 
                className="sheet-toggle-btn"
                onClick={() => setIsSheetCollapsed(prev => !prev)}
                title={isSheetCollapsed ? "Kengaytirish" : "Yopish"}
              >
                {isSheetCollapsed ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
            </div>
          </div>

          {/* Bottom Sheet Body (Collapsible Stats Grid) */}
          <div className={`sheet-collapsible-body ${isSheetCollapsed ? 'collapsed' : 'expanded'}`}>
            {/* Bottom Stats 2-Column Grid */}
            <div className="sheet-stats-grid">
              <div className="sheet-stat-card">
                <div className="stat-card-title green">
                  <Users size={16} />
                  <span>
                    {(() => {
                      const firstDriver = liveDrivers.find(d => String(d.route_id) === String(selectedRoute.id));
                      if (!firstDriver) return "Harakatda emas";
                      if (firstDriver.capacity === 'tola') return "To'la";
                      if (firstDriver.capacity === 'ozroq') return "Ozroq joy";
                      return "Bo'sh joy ko'p";
                    })()}
                  </span>
                </div>
                <div className="stat-card-subtitle">
                  {(() => {
                    const firstDriver = liveDrivers.find(d => String(d.route_id) === String(selectedRoute.id));
                    if (!firstDriver) return "Liniyada emas";
                    if (firstDriver.capacity === 'tola') return "90–100%";
                    if (firstDriver.capacity === 'ozroq') return "30–40%";
                    return "60–70%";
                  })()}
                </div>
              </div>

              <div className="sheet-stat-card">
                <div className="stat-card-title">
                  <Bus size={16} />
                  <span>
                    {liveDrivers.filter(d => String(d.route_id) === String(selectedRoute.id)).length} ta avtobus
                  </span>
                </div>
                <div className="stat-card-subtitle">Harakatda</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
