import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-rotate';
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
  RotateCcw,
  RotateCw,
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

// Determines whether driver is "ketmoqda" (from start point to end) or "kelmoqda" (from end to start)
// Based strictly on terminals and progress along route (never mobile compass heading)
function determineDriverDirection(driver, prevDriverState, polyPoints, fallbackIndex = 0) {
  const lat = Number(driver.latitude);
  const lng = Number(driver.longitude);

  if (!polyPoints || polyPoints.length < 2 || isNaN(lat) || isNaN(lng)) {
    return (prevDriverState && prevDriverState.direction) || (fallbackIndex % 2 === 0 ? 'ketmoqda' : 'kelmoqda');
  }

  // 1. Check if backend database recorded terminal departure
  if (driver.last_terminal === 'start') {
    return 'ketmoqda';
  }
  if (driver.last_terminal === 'end') {
    return 'kelmoqda';
  }

  const startPt = polyPoints[0];
  const endPt = polyPoints[polyPoints.length - 1];
  const distToStart = getDistanceMeters(lat, lng, startPt[0], startPt[1]);
  const distToEnd = getDistanceMeters(lat, lng, endPt[0], endPt[1]);

  // 2. Terminal arrival checks (within 350 meters of terminals)
  if (distToStart <= 350) {
    return 'ketmoqda'; // at start terminal -> heading to end
  }
  if (distToEnd <= 350) {
    return 'kelmoqda'; // at end terminal -> heading back to start
  }

  // 3. Keep previous direction while mid-route so direction doesn't wiggle or jump
  if (prevDriverState && prevDriverState.direction) {
    return prevDriverState.direction;
  }

  // 4. Fallback based on closest terminal
  return distToStart <= distToEnd ? 'ketmoqda' : 'kelmoqda';
}

// 1:1 Yandex Maps style User Location Pointer with phone compass arrow
const makeUserMarkerHtml = (heading = 0) => `
  <div class="user-yandex-marker-wrapper">
    <div class="user-location-arrow" style="transform: rotate(${heading}deg);">
      <svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- Vibrant Red Triangular Arrow Pointer -->
        <path d="M22 2L32 17L12 17Z" fill="#F03838" />
        <!-- Crisp White Outer Ring -->
        <circle cx="22" cy="22" r="12" fill="#FFFFFF" />
        <!-- Vibrant Red Center Core -->
        <circle cx="22" cy="22" r="7.5" fill="#F03838" />
      </svg>
    </div>
  </div>
`;

export default function MapComponent({ 
  initialRouteId = null, 
  onSelectRouteId,
  selectedDirection: propDirection = 'ketmoqda',
  setSelectedDirection: setPropDirection,
  onBackToRoutes,
  userLocation = null,
  isUserLocationActive = false
}) {
  const mapContainerRef = useRef(null);
  const mapInstance = useRef(null);
  const routeLayerGroupRef = useRef(null);
  const busLayerGroupRef = useRef(null);
  const userLayerGroupRef = useRef(null);
  const userMarkerRef = useRef(null);
  const userHeadingRef = useRef(0);
  const watchIdRef = useRef(null);
  const busMarkersRef = useRef({});
  const tileLayerRef = useRef(null);

  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [localDirection, setLocalDirection] = useState('ketmoqda');
  
  const currentDirection = propDirection !== undefined && propDirection !== null ? propDirection : localDirection;
  const setCurrentDirection = (dir) => {
    setLocalDirection(dir);
    if (setPropDirection) setPropDirection(dir);
  };

  const [liveDrivers, setLiveDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentStopIndex, setCurrentStopIndex] = useState(2); // e.g. 5-bekat (hozir)
  const [activeLayer, setActiveLayer] = useState('google');
  const [toastMessage, setToastMessage] = useState(null);
  const [currentBearing, setCurrentBearing] = useState(0);
  const [isSheetCollapsed, setIsSheetCollapsed] = useState(true);
  const [collapsedHeight, setCollapsedHeight] = useState(96);
  const [expandedHeight, setExpandedHeight] = useState(280);
  const [nearestDriverState, setNearestDriverState] = useState(null);
  const [visibleDriversCount, setVisibleDriversCount] = useState(0);

  const sheetRef = useRef(null);
  const lastFittedRouteId = useRef(null);
  const userHasMovedMap = useRef(false);
  const hasAutoZoomedToNearest = useRef(false);
  const nearestDriverRef = useRef(null);

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

  // Direction endpoint titles (e.g. 3-kichik noxiya - Qibray)
  const getStopName = (stop, fallback) => {
    if (!stop) return fallback;
    if (typeof stop === 'object') return stop.name || fallback;
    return String(stop);
  };

  let startStopName = "Bosh bekat";
  let endStopName = "Yakuniy bekat";

  if (selectedRoute) {
    const stops = Array.isArray(selectedRoute.stops) ? selectedRoute.stops : [];
    if (stops.length >= 2) {
      startStopName = getStopName(stops[0], "Bosh bekat");
      endStopName = getStopName(stops[stops.length - 1], "Yakuniy bekat");
    } else if (selectedRoute.direction) {
      const parts = selectedRoute.direction.split(/[-→—]/).map(s => s.trim());
      if (parts.length >= 2) {
        startStopName = parts[0];
        endStopName = parts[1];
      }
    }
  }

  const forwardDirTitle = `${startStopName} - ${endStopName}`;
  const backwardDirTitle = `${endStopName} - ${startStopName}`;
  const currentDirTitle = currentDirection === 'ketmoqda' ? forwardDirTitle : backwardDirTitle;

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

  // Sync selectedRoute if initialRouteId prop changes
  useEffect(() => {
    if (initialRouteId && routes.length > 0) {
      const found = routes.find(r => String(r.id) === String(initialRouteId));
      if (found && (!selectedRoute || String(selectedRoute.id) !== String(found.id))) {
        setSelectedRoute(found);
      }
    }
  }, [initialRouteId, routes]);

  // When route or direction changes, reset auto-zoom flag to zoom to nearest car
  useEffect(() => {
    hasAutoZoomedToNearest.current = false;
    userHasMovedMap.current = false;
  }, [selectedRoute?.id, currentDirection, isUserLocationActive]);

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
    // Real-time polling every 1.5 seconds without freezing
    const interval = setInterval(fetchLiveDrivers, 1500);
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
      rotate: true,
      touchRotate: true,
      rotateControl: false,
      bearing: 0,
      dragging: true,
      touchZoom: true,
      tap: false,
      bounceAtZoomLimits: false,
      maxZoom: 20,
      minZoom: 6
    });

    // Track rotation angle to update compass
    map.on('rotate', () => {
      try {
        const b = map.getBearing ? map.getBearing() : 0;
        setCurrentBearing(Math.round(b));
      } catch (e) {
        // quiet fallback
      }
    });

    const initialLayer = MAP_LAYERS[activeLayer] || MAP_LAYERS.google;
    tileLayerRef.current = L.tileLayer(initialLayer.url, {
      subdomains: initialLayer.subdomains,
      maxZoom: initialLayer.maxZoom
    }).addTo(map);

    routeLayerGroupRef.current = L.layerGroup().addTo(map);
    busLayerGroupRef.current = L.layerGroup().addTo(map);
    userLayerGroupRef.current = L.layerGroup().addTo(map);
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

  // Set up Device Orientation (Compass) listener to rotate user pointer in real-time
  useEffect(() => {
    let lastHeading = null;

    const updateArrowRotation = (rawHeading) => {
      if (rawHeading === null || isNaN(rawHeading)) return;
      let h = Math.round(Number(rawHeading)) % 360;
      if (h < 0) h += 360;

      // Small jitter deadband: only update if changed by >= 1.5 degrees
      if (lastHeading !== null && Math.abs(h - lastHeading) < 1.5) return;
      lastHeading = h;
      userHeadingRef.current = h;

      const markerEl = userMarkerRef.current?.getElement();
      if (markerEl) {
        const arrowEl = markerEl.querySelector('.user-location-arrow');
        if (arrowEl) {
          arrowEl.style.transform = `rotate(${h}deg)`;
        }
      }
    };

    const handleOrientation = (e) => {
      let heading = null;

      if (typeof e.webkitCompassHeading !== 'undefined' && e.webkitCompassHeading !== null) {
        // iOS: webkitCompassHeading is magnetic compass heading (0 = North, clockwise)
        heading = e.webkitCompassHeading;
      } else if (e.alpha !== null && typeof e.alpha !== 'undefined') {
        // Android / standard alpha (alpha is counter-clockwise around Z)
        heading = (360 - e.alpha) % 360;
      }

      if (heading !== null) {
        updateArrowRotation(heading);
      }
    };

    if ('ondeviceorientationabsolute' in window) {
      window.addEventListener('deviceorientationabsolute', handleOrientation, true);
    }
    window.addEventListener('deviceorientation', handleOrientation, true);

    // Watch position GPS heading as fallback when device is in motion
    if ('geolocation' in navigator) {
      try {
        const wId = navigator.geolocation.watchPosition(
          (pos) => {
            if (pos.coords.heading !== null && !isNaN(pos.coords.heading) && pos.coords.heading >= 0) {
              updateArrowRotation(pos.coords.heading);
            }
          },
          () => {},
          { enableHighAccuracy: true, maximumAge: 2000 }
        );
        watchIdRef.current = wId;
      } catch (e) {}
    }

    return () => {
      if ('ondeviceorientationabsolute' in window) {
        window.removeEventListener('deviceorientationabsolute', handleOrientation, true);
      }
      window.removeEventListener('deviceorientation', handleOrientation, true);
      if (watchIdRef.current !== null && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Render User My Location Marker when user location is active
  useEffect(() => {
    if (!mapInstance.current || !userLayerGroupRef.current) return;

    userLayerGroupRef.current.clearLayers();
    userMarkerRef.current = null;

    if (isUserLocationActive && userLocation && userLocation.lat && userLocation.lng) {
      const lat = Number(userLocation.lat);
      const lng = Number(userLocation.lng);

      if (!isNaN(lat) && !isNaN(lng)) {
        const userMarker = L.marker([lat, lng], {
          icon: L.divIcon({
            className: 'user-marker-wrapper',
            html: makeUserMarkerHtml(userHeadingRef.current || 0),
            iconSize: [44, 44],
            iconAnchor: [22, 22]
          }),
          zIndexOffset: 2500
        });

        userMarker.addTo(userLayerGroupRef.current);
        userMarkerRef.current = userMarker;
      }
    }
  }, [isUserLocationActive, userLocation]);

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
      hasAutoZoomedToNearest.current = false;

      // Only fit entire polyline if user location is NOT active
      if (!isUserLocationActive || !userLocation) {
        const bounds = L.latLngBounds(polyPoints);
        mapInstance.current.fitBounds(bounds, {
          paddingTopLeft: [40, 40],
          paddingBottomRight: [40, isSheetCollapsed ? 120 : 260]
        });
      }
    }

  }, [selectedRoute, currentStopIndex]);

  // 2. Real-time Live Drivers Marker Layer (Non-freezing, smooth setLatLng and instant removal)
  useEffect(() => {
    if (!mapInstance.current || !busLayerGroupRef.current || !selectedRoute) return;

    const routeDrivers = (liveDrivers || []).filter(
      d => d && d.route_id && selectedRoute && String(d.route_id) === String(selectedRoute.id) && d.is_online !== false
    );

    // Compute progress, direction and ETA for each driver
    const processedRouteDrivers = routeDrivers.map((driver, dIdx) => {
      const lat = Number(driver.latitude);
      const lng = Number(driver.longitude);
      if (!lat || !lng || isNaN(lat) || isNaN(lng)) return null;

      const existingState = busMarkersRef.current[String(driver.driver_id || driver.id)];
      const direction = determineDriverDirection(driver, existingState, routePolyPoints, dIdx);

      let hasPassedUser = false;
      let userDistMeters = null;
      let userDistanceText = null;
      let etaMinutes = 3;

      if (isUserLocationActive && userLocation && userLocation.lat && userLocation.lng && routePolyPoints.length >= 2) {
        const uLat = Number(userLocation.lat);
        const uLng = Number(userLocation.lng);
        const userProgress = getRouteProgress(uLat, uLng, routePolyPoints);
        const vehProgress = getRouteProgress(lat, lng, routePolyPoints);

        if (direction === 'ketmoqda') {
          if (vehProgress > (userProgress + 50)) {
            hasPassedUser = true;
          } else {
            userDistMeters = Math.max(0, userProgress - vehProgress);
          }
        } else {
          if (vehProgress < (userProgress - 50)) {
            hasPassedUser = true;
          } else {
            userDistMeters = Math.max(0, vehProgress - userProgress);
          }
        }

        if (!hasPassedUser && userDistMeters !== null) {
          etaMinutes = Math.max(1, Math.round(userDistMeters / 380));
          userDistanceText = userDistMeters >= 1000
            ? `${(userDistMeters / 1000).toFixed(1)} km`
            : `${Math.round(userDistMeters)} m`;
        }
      } else if (isUserLocationActive && userLocation && userLocation.lat && userLocation.lng) {
        userDistMeters = getDistanceMeters(
          Number(userLocation.lat),
          Number(userLocation.lng),
          lat,
          lng
        );
        etaMinutes = Math.max(1, Math.round((userDistMeters * 1.25) / 380));
        userDistanceText = userDistMeters >= 1000
          ? `${(userDistMeters / 1000).toFixed(1)} km`
          : `${Math.round(userDistMeters)} m`;
      }

      return {
        ...driver,
        direction,
        hasPassedUser,
        userDistMeters,
        userDistanceText,
        etaMinutes
      };
    }).filter(Boolean);

    // All active drivers on this route are visible on the map (both Ketmoqda and Kelmoqda)
    // Never hide returning cars from the map so user can see full real-time movement
    const visibleDrivers = processedRouteDrivers;

    setVisibleDriversCount(visibleDrivers.length);

    // Find nearest vehicle to user (prioritizing approaching vehicles in current direction)
    let nearest = null;
    let minD = Infinity;
    const approachingVehicles = visibleDrivers.filter(d => !d.hasPassedUser && d.direction === currentDirection);
    const candidateList = approachingVehicles.length > 0 ? approachingVehicles : visibleDrivers;

    candidateList.forEach(d => {
      const dist = d.userDistMeters !== null && d.userDistMeters !== undefined
        ? d.userDistMeters
        : getDistanceMeters(Number(userLocation?.lat || 0), Number(userLocation?.lng || 0), Number(d.latitude), Number(d.longitude));
      if (dist < minD) {
        minD = dist;
        nearest = d;
      }
    });

    nearestDriverRef.current = nearest;
    setNearestDriverState(nearest);

    // Auto zoom smoothly to user + nearest vehicle when map opens or direction changes
    if (isUserLocationActive && userLocation && userLocation.lat && userLocation.lng && mapInstance.current && !hasAutoZoomedToNearest.current && !userHasMovedMap.current) {
      const uLat = Number(userLocation.lat);
      const uLng = Number(userLocation.lng);

      if (nearest && nearest.latitude && nearest.longitude) {
        const dLat = Number(nearest.latitude);
        const dLng = Number(nearest.longitude);
        const bounds = L.latLngBounds([
          [uLat, uLng],
          [dLat, dLng]
        ]);
        mapInstance.current.fitBounds(bounds, {
          paddingTopLeft: [70, 70],
          paddingBottomRight: [70, isSheetCollapsed ? 140 : 280],
          maxZoom: 16,
          animate: true
        });
        hasAutoZoomedToNearest.current = true;
      } else if (liveDrivers.length > 0) {
        mapInstance.current.setView([uLat, uLng], 16, { animate: true });
        hasAutoZoomedToNearest.current = true;
      }
    }

    const visibleIds = new Set(visibleDrivers.map(d => String(d.driver_id || d.id)));

    // A. Remove markers for drivers who went offline or left this route
    Object.keys(busMarkersRef.current).forEach(id => {
      if (!visibleIds.has(id)) {
        if (busMarkersRef.current[id]?.marker) {
          busMarkersRef.current[id].marker.remove();
        }
        delete busMarkersRef.current[id];
      }
    });

    // B. Smoothly update existing markers or create new ones for visible drivers
    visibleDrivers.forEach((driver) => {
      const id = String(driver.driver_id || driver.id);
      const lat = Number(driver.latitude);
      const lng = Number(driver.longitude);
      if (!lat || !lng || isNaN(lat) || isNaN(lng)) return;

      const direction = driver.direction;
      const isKetmoqda = direction === 'ketmoqda';
      
      const forwardColor = selectedRoute?.arrow_color_forward || '#0066FF';
      const backwardColor = selectedRoute?.arrow_color_backward || '#10B981';
      const busColor = isKetmoqda ? forwardColor : backwardColor;
      const dirText = isKetmoqda ? 'Ketmoqda' : 'Kelmoqda';

      // Determine rotation angle for the arrow:
      // Prefer real-time movement GPS heading, fallback to route segment bearing
      const routeBearing = getRouteSegmentBearing(lat, lng, routePolyPoints);
      let rotationAngle = 0;
      if (driver.heading && Number(driver.heading) > 0) {
        rotationAngle = Math.round(Number(driver.heading));
      } else if (routeBearing !== null) {
        rotationAngle = isKetmoqda ? Math.round(routeBearing) : Math.round((routeBearing + 180) % 360);
      } else {
        rotationAngle = isKetmoqda ? 0 : 180;
      }
      const carNum = driver.car_number || driver.surname || '';
      const isNearest = nearest && String(nearest.driver_id || nearest.id) === id && isUserLocationActive;
      const popupHtml = `
        <div style="font-family: sans-serif; font-size: 13px; padding: 6px;">
          <div style="font-weight: 700; color: #0f172a;">${driver.name} ${isNearest ? '<span style="background: #2563eb; color: #fff; font-size: 10px; padding: 2px 6px; border-radius: 6px; margin-left: 4px;">Eng yaqin</span>' : ''}</div>
          ${carNum ? `<div style="display: inline-block; font-family: monospace; font-weight: 800; font-size: 12px; background: #f8fafc; border: 1.5px solid #0f172a; padding: 1px 6px; border-radius: 4px; margin-top: 3px; color: #0f172a;">${carNum}</div>` : ''}
          <div style="color: #64748b; font-size: 12px; margin-top: 3px;">
            ${driver.route_number || selectedRoute.number}-marshrut • <strong style="color: ${busColor};">${dirText}</strong>
          </div>
          ${driver.userDistanceText ? `<div style="color: #0066FF; font-weight: 600; font-size: 12px; margin-top: 3px;">Sizgacha: ${driver.userDistanceText} (~${driver.etaMinutes} daq)</div>` : ''}
        </div>
      `;

      const markerHtml = `
        <div class="driver-arrow-container ${isNearest ? 'nearest-car-pulse' : ''}">
          ${isNearest ? '<div class="nearest-car-badge">Eng yaqin</div>' : ''}
          <div class="driver-arrow-wrap" style="transform: rotate(${rotationAngle}deg);">
            <svg width="34" height="34" viewBox="0 0 32 32">
              <path d="M16 2 L28 27 L16 21 L4 27 Z" fill="${busColor}" stroke="#ffffff" stroke-width="2.5" stroke-linejoin="round"/>
            </svg>
          </div>
        </div>
      `;

      if (busMarkersRef.current[id]) {
        // Marker already exists -> smoothly update position without re-creating DOM
        const existing = busMarkersRef.current[id];
        existing.marker.setLatLng([lat, lng]);
        
        const rotDiff = Math.abs((existing.rotationAngle || 0) - rotationAngle);
        const shouldUpdateIcon = existing.direction !== direction || existing.capacity !== driver.capacity || rotDiff >= 4;

        if (shouldUpdateIcon) {
          existing.direction = direction;
          existing.capacity = driver.capacity;
          existing.rotationAngle = rotationAngle;
          existing.marker.setIcon(L.divIcon({
            className: 'bus-marker-wrapper',
            html: markerHtml,
            iconSize: [34, 34],
            iconAnchor: [17, 17]
          }));
        }
        existing.marker.setPopupContent(popupHtml);
        existing.prevLat = lat;
        existing.prevLng = lng;
      } else {
        // Create new marker
        const busMarker = L.marker([lat, lng], {
          icon: L.divIcon({
            className: 'bus-marker-wrapper',
            html: markerHtml,
            iconSize: [34, 34],
            iconAnchor: [17, 17]
          }),
          zIndexOffset: 1000
        });

        busMarker.bindPopup(popupHtml);
        busMarker.addTo(busLayerGroupRef.current);

        busMarkersRef.current[id] = {
          marker: busMarker,
          capacity: driver.capacity,
          direction: direction,
          rotationAngle: rotationAngle,
          prevLat: lat,
          prevLng: lng
        };
      }
    });

  }, [liveDrivers, selectedRoute, routePolyPoints, isUserLocationActive, currentDirection, userLocation]);

  // Center map on user GPS location and nearest vehicle
  const handleLocateMe = () => {
    // Request device orientation permission on iOS if available
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        DeviceOrientationEvent.requestPermission().catch(() => {});
      } catch (e) {}
    }

    if (isUserLocationActive && userLocation && userLocation.lat && userLocation.lng && mapInstance.current) {
      const uLat = Number(userLocation.lat);
      const uLng = Number(userLocation.lng);

      if (nearestDriverRef.current && nearestDriverRef.current.latitude && nearestDriverRef.current.longitude) {
        const dLat = Number(nearestDriverRef.current.latitude);
        const dLng = Number(nearestDriverRef.current.longitude);
        const bounds = L.latLngBounds([[uLat, uLng], [dLat, dLng]]);
        mapInstance.current.fitBounds(bounds, {
          paddingTopLeft: [70, 70],
          paddingBottomRight: [70, isSheetCollapsed ? 140 : 280],
          maxZoom: 16,
          animate: true
        });
        setToastMessage("Siz va eng yaqin avtomobil ko'rsatildi");
      } else {
        mapInstance.current.setView([uLat, uLng], 16, { animate: true });
        setToastMessage("Joylashuvingizga o'tildi");
      }
      setTimeout(() => setToastMessage(null), 1800);
      return;
    }

    if ("geolocation" in navigator && mapInstance.current) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const userLatLng = [pos.coords.latitude, pos.coords.longitude];
          mapInstance.current.setView(userLatLng, 16, { animate: true });
          
          if (userLayerGroupRef.current) {
            userLayerGroupRef.current.clearLayers();
            const marker = L.marker(userLatLng, {
              icon: L.divIcon({
                className: 'user-marker-wrapper',
                html: makeUserMarkerHtml(userHeadingRef.current || 0),
                iconSize: [44, 44],
                iconAnchor: [22, 22]
              }),
              zIndexOffset: 2500
            }).addTo(userLayerGroupRef.current);
            userMarkerRef.current = marker;
          }
        },
        (err) => alert("Joylashuvingizni aniqlab bo'lmadi: " + err.message),
        { enableHighAccuracy: true }
      );
    }
  };

  // Rotation controls: rotate left, rotate right, and reset bearing
  const handleRotateLeft = () => {
    if (!mapInstance.current || !mapInstance.current.setBearing) return;
    const cur = mapInstance.current.getBearing ? mapInstance.current.getBearing() : 0;
    const newB = (cur - 30 + 360) % 360;
    mapInstance.current.setBearing(newB);
    setCurrentBearing(Math.round(newB));
  };

  const handleRotateRight = () => {
    if (!mapInstance.current || !mapInstance.current.setBearing) return;
    const cur = mapInstance.current.getBearing ? mapInstance.current.getBearing() : 0;
    const newB = (cur + 30) % 360;
    mapInstance.current.setBearing(newB);
    setCurrentBearing(Math.round(newB));
  };

  const handleCompassClick = () => {
    if (!mapInstance.current) return;
    if (currentBearing !== 0 && mapInstance.current.setBearing) {
      mapInstance.current.setBearing(0);
      setCurrentBearing(0);
      setToastMessage("Shimolga to'g'rilandi (0°)");
      setTimeout(() => setToastMessage(null), 1800);
    } else {
      handleResetView();
    }
  };

  // Toggle route direction and notify parent / re-zoom
  const handleReverseDirection = () => {
    const nextDir = currentDirection === 'ketmoqda' ? 'kelmoqda' : 'ketmoqda';
    setCurrentDirection(nextDir);
    userHasMovedMap.current = false;
    hasAutoZoomedToNearest.current = false;
    const nextTitle = nextDir === 'ketmoqda' ? forwardDirTitle : backwardDirTitle;
    setToastMessage(`Yo'nalish: ${nextTitle}`);
    setTimeout(() => setToastMessage(null), 2000);
  };

  // Switch between routes if user has multiple routes
  const handleSwitchRoute = () => {
    if (routes.length <= 1) return;
    const currentIndex = routes.findIndex(r => r.id === selectedRoute.id);
    const nextIndex = (currentIndex + 1) % routes.length;
    const nextRoute = routes[nextIndex];
    setSelectedRoute(nextRoute);
    if (onSelectRouteId) {
      onSelectRouteId(nextRoute.id);
    }
    setToastMessage(`${nextRoute.name} ga o'tildi`);
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

        {/* Zoom Controls */}
        <div className="zoom-btn-group">
          <button className="map-ctrl-btn zoom-btn" onClick={handleZoomIn} title="Kattalashtirish (+)">
            <Plus size={18} color="#0f172a" />
          </button>
          <button className="map-ctrl-btn zoom-btn" onClick={handleZoomOut} title="Kichiklashtirish (-)">
            <Minus size={18} color="#0f172a" />
          </button>
        </div>

        {/* Rotate Controls (O'ngga / Chapga aylantirish) */}
        <div className="zoom-btn-group rotate-btn-group">
          <button className="map-ctrl-btn zoom-btn" onClick={handleRotateLeft} title="Chapga aylantirish (↶)">
            <RotateCcw size={16} color="#0f172a" />
          </button>
          <button className="map-ctrl-btn zoom-btn" onClick={handleRotateRight} title="O'ngga aylantirish (↷)">
            <RotateCw size={16} color="#0f172a" />
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
          onClick={handleCompassClick} 
          title={currentBearing !== 0 ? `Shimolga to'g'rilash (${currentBearing}°)` : "Marshrutni markazlashtirish"}
        >
          <Compass 
            size={18} 
            color={currentBearing !== 0 ? "#0066FF" : "#0f172a"}
            style={{
              transform: `rotate(${-currentBearing}deg)`,
              transition: 'transform 0.2s ease-out'
            }}
          />
        </button>
      </div>

      {/* 3. Floating Legend Box (Bottom Left above sheet) */}
      <div 
        className="floating-legend-box"
        style={{ bottom: `${floatingBottom}px` }}
      >
        <div className="legend-row">
          <div className="legend-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="15" height="15" viewBox="0 0 32 32">
              <path d="M16 2 L28 27 L16 21 L4 27 Z" fill={selectedRoute?.arrow_color_forward || '#0066FF'} stroke="#ffffff" strokeWidth="2" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="legend-label">Ketmoqda</span>
        </div>
        <div className="legend-row">
          <div className="legend-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="15" height="15" viewBox="0 0 32 32" style={{ transform: 'rotate(180deg)' }}>
              <path d="M16 2 L28 27 L16 21 L4 27 Z" fill={selectedRoute?.arrow_color_backward || '#10B981'} stroke="#ffffff" strokeWidth="2" strokeLinejoin="round"/>
            </svg>
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
              <p className="sheet-route-direction">{currentDirTitle}</p>
            </div>

            <div className="sheet-header-actions">
              <button className="sheet-direction-btn" onClick={handleReverseDirection} title="Yo'nalishni almashtirish">
                <span>{currentDirection === 'ketmoqda' ? 'Ketmoqda' : 'Kelmoqda'}</span>
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
                  <Clock size={16} />
                  <span>
                    {nearestDriverState 
                      ? `${nearestDriverState.etaMinutes || 1} daqiqa` 
                      : (isUserLocationActive ? "Avtomobil yo'q" : "Harakatda")}
                  </span>
                </div>
                <div className="stat-card-subtitle">
                  {nearestDriverState 
                    ? `Eng yaqin (${nearestDriverState.userDistanceText || ''})` 
                    : (isUserLocationActive ? "Ushbu yo'nalishda" : "Liniyada")}
                </div>
              </div>

              <div className="sheet-stat-card">
                <div className="stat-card-title">
                  <Bus size={16} />
                  <span>
                    {visibleDriversCount} ta avtobus
                  </span>
                </div>
                <div className="stat-card-subtitle">
                  {isUserLocationActive ? "Siz tomonga kelmoqda" : "Harakatda"}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
