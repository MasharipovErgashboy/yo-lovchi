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
  Navigation, 
  Layers, 
  Compass, 
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

export default function MapComponent({ initialRouteId = null, onBackToRoutes }) {
  const mapContainerRef = useRef(null);
  const mapInstance = useRef(null);
  const layerGroupRef = useRef(null);
  const tileLayerRef = useRef(null);

  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [directionReversed, setDirectionReversed] = useState(false);
  const [liveDrivers, setLiveDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentStopIndex, setCurrentStopIndex] = useState(2); // e.g. 5-bekat (hozir)
  const [activeLayer, setActiveLayer] = useState('google');
  const [toastMessage, setToastMessage] = useState(null);

  // Fetch routes and live drivers from backend
  const fetchData = async () => {
    try {
      const [rRes, dRes] = await Promise.all([
        fetch('/api/routes'),
        fetch('/api/live-drivers')
      ]);

      let routesData = [];
      if (rRes.ok) {
        routesData = await rRes.json();
        setRoutes(routesData || []);
      }

      if (dRes.ok) {
        const driversData = await dRes.json();
        setLiveDrivers(driversData || []);
      }

      if (routesData.length > 0) {
        // Pick initial route or first route
        const found = initialRouteId 
          ? routesData.find(r => String(r.id) === String(initialRouteId)) 
          : routesData[0];
        setSelectedRoute(prev => prev || found || routesData[0]);
      }
    } catch (e) {
      console.error("Map data fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000);
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
      attributionControl: false
    });

    const initialLayer = MAP_LAYERS[activeLayer] || MAP_LAYERS.google;
    tileLayerRef.current = L.tileLayer(initialLayer.url, {
      subdomains: initialLayer.subdomains,
      maxZoom: initialLayer.maxZoom
    }).addTo(map);

    layerGroupRef.current = L.layerGroup().addTo(map);
    mapInstance.current = map;

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

  // Update map polyline, stops, and buses whenever selectedRoute or liveDrivers changes
  useEffect(() => {
    if (!mapInstance.current || !layerGroupRef.current || !selectedRoute) return;

    const layerGroup = layerGroupRef.current;
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

    // Default sample path if no coordinates exist yet (Toshkent → Chirchiq as in Image 3)
    if (polyPoints.length < 2) {
      polyPoints = [
        [41.3111, 69.2797], // Tashkent
        [41.3350, 69.3200],
        [41.3650, 69.3700],
        [41.3900, 69.4300],
        [41.4200, 69.5000],
        [41.4689, 69.5822]  // Chirchiq
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

    // 1. Draw glowing background polyline and main blue polyline
    L.polyline(polyPoints, {
      color: '#0066FF',
      weight: 6,
      opacity: 0.9,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(layerGroup);

    // Subtle outline / glow
    L.polyline(polyPoints, {
      color: 'rgba(0, 102, 255, 0.25)',
      weight: 12,
      opacity: 0.5,
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

    // 3. Draw Bus Markers (Blue = Siz tomonga kelmoqda, Green = Sizdan uzoqlashmoqda)
    // Find active drivers on this route
    const routeDrivers = liveDrivers.filter(d => String(d.route_id) === String(selectedRoute.id));

    // If live drivers exist, render them
    if (routeDrivers.length > 0) {
      routeDrivers.forEach((driver, dIdx) => {
        const isApproaching = dIdx % 2 === 0; // alternate for demo/live
        const busColor = isApproaching ? '#0066FF' : '#10B981';
        const badgeText = isApproaching ? 'Kelyapti' : 'Ketyapti';

        const busIconHtml = `
          <div class="custom-bus-marker ${isApproaching ? 'approaching' : 'leaving'}">
            <div class="bus-badge-label" style="background: ${busColor}">
              ${badgeText}
            </div>
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
            ${isApproaching ? `
              <div class="active-bus-speech-bubble">
                <div class="bubble-title">${selectedRoute.number}-marshrut</div>
                <div class="bubble-sub">${stops[currentStopIndex]?.name || '5-bekatga yaqin'}</div>
                <div class="bubble-eta">4 daq</div>
              </div>
            ` : ''}
          </div>
        `;

        const busMarker = L.marker([driver.latitude, driver.longitude], {
          icon: L.divIcon({
            className: 'bus-marker-wrapper',
            html: busIconHtml,
            iconSize: [44, 44],
            iconAnchor: [22, 22]
          }),
          zIndexOffset: 1000
        });

        busMarker.bindPopup(`
          <div style="font-family: sans-serif; font-size: 13px; padding: 6px;">
            <strong>${driver.name} ${driver.surname}</strong>
            <div style="color: #64748b; font-size: 12px; margin-top: 2px;">
              ${driver.route_number || selectedRoute.number}-marshrut
            </div>
            <div style="color: #10b981; font-weight: 600; margin-top: 4px;">
              ${driver.capacity === 'bosh' ? "Bo'sh joy ko'p" : "O'rtacha joy"}
            </div>
          </div>
        `);

        busMarker.addTo(layerGroup);
      });
    } else {
      // Demo buses along the polyline so user sees the exact Image 3 representation right away!
      const point1 = polyPoints[Math.min(2, polyPoints.length - 1)]; // Near stop 3 (approaching)
      const point2 = polyPoints[Math.min(4, polyPoints.length - 1)]; // Near stop 5 (leaving)
      const point0 = polyPoints[0]; // Near start

      // Bus 1: Approaching (Blue with Speech Bubble)
      const bus1Html = `
        <div class="custom-bus-marker approaching">
          <div class="bus-badge-label" style="background: #0066FF">Kelyapti</div>
          <div class="bus-circle-icon" style="background: #0066FF">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M8 6v6"></path><path d="M15 6v6"></path><path d="M2 12h19.6"></path>
              <path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"></path>
              <circle cx="7" cy="18" r="2"></circle><circle cx="15" cy="18" r="2"></circle>
            </svg>
          </div>
          <div class="active-bus-speech-bubble">
            <div class="bubble-title">${selectedRoute.number}-marshrut</div>
            <div class="bubble-sub">5-bekatga yaqin</div>
            <div class="bubble-eta">4 daq</div>
          </div>
        </div>
      `;
      L.marker(point1, {
        icon: L.divIcon({ className: 'bus-marker-wrapper', html: bus1Html, iconSize: [44, 44], iconAnchor: [22, 22] }),
        zIndexOffset: 1000
      }).addTo(layerGroup);

      // Bus 2: Leaving (Green)
      const bus2Html = `
        <div class="custom-bus-marker leaving">
          <div class="bus-badge-label" style="background: #10B981">Ketyapti</div>
          <div class="bus-circle-icon" style="background: #10B981">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M8 6v6"></path><path d="M15 6v6"></path><path d="M2 12h19.6"></path>
              <path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"></path>
              <circle cx="7" cy="18" r="2"></circle><circle cx="15" cy="18" r="2"></circle>
            </svg>
          </div>
        </div>
      `;
      L.marker(point2, {
        icon: L.divIcon({ className: 'bus-marker-wrapper', html: bus2Html, iconSize: [44, 44], iconAnchor: [22, 22] }),
        zIndexOffset: 900
      }).addTo(layerGroup);

      // Bus 3: Near start (Green)
      const bus3Html = `
        <div class="custom-bus-marker leaving">
          <div class="bus-badge-label" style="background: #10B981">Ketyapti</div>
          <div class="bus-circle-icon" style="background: #10B981">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M8 6v6"></path><path d="M15 6v6"></path><path d="M2 12h19.6"></path>
              <path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"></path>
              <circle cx="7" cy="18" r="2"></circle><circle cx="15" cy="18" r="2"></circle>
            </svg>
          </div>
        </div>
      `;
      L.marker(point0, {
        icon: L.divIcon({ className: 'bus-marker-wrapper', html: bus3Html, iconSize: [44, 44], iconAnchor: [22, 22] }),
        zIndexOffset: 800
      }).addTo(layerGroup);
    }

    // Zoom and center bounds around polyline
    const bounds = L.latLngBounds(polyPoints);
    mapInstance.current.fitBounds(bounds, {
      paddingTopLeft: [40, 40],
      paddingBottomRight: [40, 260] // Leave room for bottom sheet
    });

  }, [selectedRoute, liveDrivers, currentStopIndex]);

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

  // Timeline stops
  const currentStops = (selectedRoute && Array.isArray(selectedRoute.stops) && selectedRoute.stops.length > 0)
    ? selectedRoute.stops.map((s, idx) => (typeof s === 'object' ? s.name || `Bekat ${idx + 1}` : String(s)))
    : ["Do'stlik bekati", "Qiyot bekati", "5-bekat (hozir)", "6-bekat", "7-bekat", "8-bekat"];

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

      {/* 2. Floating Action Controls (Right side - exactly like Image 3) */}
      <div className="floating-map-controls">
        <button className="map-ctrl-btn" onClick={handleLocateMe} title="Mening joylashuvim">
          <Navigation size={18} color="#0f172a" />
        </button>
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

      {/* 3. Floating Legend Box (Bottom Left above sheet - exactly like Image 3) */}
      <div className="floating-legend-box">
        <div className="legend-row">
          <div className="legend-icon blue">
            <Bus size={14} color="#0066FF" />
            <span className="legend-arrow">➔</span>
          </div>
          <span className="legend-label">Siz tomonga kelmoqda</span>
        </div>
        <div className="legend-row">
          <div className="legend-icon green">
            <Bus size={14} color="#10B981" />
            <span className="legend-arrow">➔</span>
          </div>
          <span className="legend-label">Sizdan uzoqlashmoqda</span>
        </div>
      </div>

      {/* 4. Bottom Sheet Card (Exactly like Image 3) */}
      {selectedRoute && (
        <div className="map-bottom-sheet">
          <div className="sheet-drag-handle"></div>

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
              onClick={handleSwitchRoute}
              style={{ cursor: routes.length > 1 ? 'pointer' : 'default' }}
              title={routes.length > 1 ? "Boshqa marshrutga o'tish" : ""}
            >
              <h3 className="sheet-route-title">
                {selectedRoute.name}
                {routes.length > 1 && (
                  <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '6px', fontWeight: 500 }}>
                    ({routes.findIndex(r => r.id === selectedRoute.id) + 1}/{routes.length})
                  </span>
                )}
              </h3>
              <p className="sheet-route-direction">{selectedRoute.direction || 'Andijon (Eski shahar) → Asaka'}</p>
            </div>

            <button className="sheet-direction-btn" onClick={handleReverseDirection}>
              <span>Yo'nalish</span>
              <ArrowLeftRight size={14} />
            </button>
          </div>

          {/* Stops Timeline Slider */}
          <div className="sheet-stops-timeline">
            <button 
              className="timeline-nav-btn"
              onClick={() => setCurrentStopIndex(prev => Math.max(0, prev - 1))}
              disabled={currentStopIndex === 0}
            >
              <ChevronLeft size={16} />
            </button>

            <div className="timeline-track-container">
              <div className="timeline-track-line">
                <div 
                  className="timeline-track-fill" 
                  style={{ width: `${(currentStopIndex / (currentStops.length - 1)) * 100}%` }}
                />
              </div>

              <div className="timeline-stops-points">
                {currentStops.map((stopName, idx) => {
                  const isPast = idx < currentStopIndex;
                  const isCurrent = idx === currentStopIndex;

                  return (
                    <div 
                      key={idx} 
                      className={`timeline-stop-item ${isCurrent ? 'active' : ''}`}
                      onClick={() => setCurrentStopIndex(idx)}
                    >
                      <div className="stop-point-circle">
                        {isCurrent ? (
                          <div className="current-bus-badge">
                            <Bus size={12} color="#ffffff" />
                          </div>
                        ) : (
                          <div className={`point-dot ${isPast ? 'past' : ''}`}></div>
                        )}
                      </div>
                      <span className="stop-name-label">
                        {stopName}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <button 
              className="timeline-nav-btn"
              onClick={() => setCurrentStopIndex(prev => Math.min(currentStops.length - 1, prev + 1))}
              disabled={currentStopIndex === currentStops.length - 1}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Bottom Stats 3-Column Grid */}
          <div className="sheet-stats-grid">
            <div className="sheet-stat-card">
              <div className="stat-card-title green">
                <Users size={16} />
                <span>Bo'sh joy ko'p</span>
              </div>
              <div className="stat-card-subtitle">60–70%</div>
            </div>

            <div className="sheet-stat-card">
              <div className="stat-card-title">
                <Bus size={16} />
                <span>2 ta avtobus</span>
              </div>
              <div className="stat-card-subtitle">Yo'nalishda</div>
            </div>

            <div className="sheet-stat-card">
              <div className="stat-card-title">
                <Clock size={16} />
                <span>4 daq</span>
              </div>
              <div className="stat-card-subtitle">Yaqin avtobus</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
