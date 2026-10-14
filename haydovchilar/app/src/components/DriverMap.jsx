import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation, Plus, Minus, Bus } from 'lucide-react';

export default function DriverMap({ assignedRoute, driverLocation }) {
  const mapContainerRef = useRef(null);
  const mapInstance = useRef(null);
  const driverMarkerRef = useRef(null);
  const layerGroupRef = useRef(null);

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

    const layerGroup = L.layerGroup().addTo(map);
    layerGroupRef.current = layerGroup;
    mapInstance.current = map;

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  // Draw Assigned Route Polyline & Stops (NO OTHER DRIVERS)
  useEffect(() => {
    if (!mapInstance.current || !layerGroupRef.current || !assignedRoute) return;

    const layerGroup = layerGroupRef.current;
    layerGroup.clearLayers();

    // 1. Draw Stops & build polyline
    const stops = assignedRoute.stops || [];
    let polyPoints = [];

    if (Array.isArray(assignedRoute.polyline) && assignedRoute.polyline.length > 0) {
      polyPoints = assignedRoute.polyline;
    } else if (stops.length > 0) {
      polyPoints = stops.map(s => [Number(s.lat), Number(s.lng)]);
    }

    // Draw route line
    if (polyPoints.length > 1) {
      const routeColor = assignedRoute.color && assignedRoute.color.startsWith('#') 
        ? assignedRoute.color 
        : '#0066FF';

      // Outer glow / border
      L.polyline(polyPoints, {
        color: '#ffffff',
        weight: 7,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(layerGroup);

      // Main line
      L.polyline(polyPoints, {
        color: routeColor,
        weight: 5,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(layerGroup);

      // Fit bounds if driver hasn't moved map
      try {
        const bounds = L.latLngBounds(polyPoints);
        mapInstance.current.fitBounds(bounds, { padding: [30, 30] });
      } catch (e) {}
    }

    // Draw Stops
    stops.forEach((stop, idx) => {
      if (!stop.lat || !stop.lng) return;
      const isTerminal = idx === 0 || idx === stops.length - 1;
      const stopHtml = `
        <div style="
          width: ${isTerminal ? '18px' : '14px'};
          height: ${isTerminal ? '18px' : '14px'};
          border-radius: 50%;
          background: ${isTerminal ? '#0066FF' : '#ffffff'};
          border: 3px solid ${isTerminal ? '#ffffff' : '#0066FF'};
          box-shadow: 0 2px 6px rgba(0,0,0,0.25);
        "></div>
      `;

      L.marker([Number(stop.lat), Number(stop.lng)], {
        icon: L.divIcon({
          className: 'driver-stop-marker',
          html: stopHtml,
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        })
      })
      .bindPopup(`<strong>${stop.name}</strong>`)
      .addTo(layerGroup);
    });

  }, [assignedRoute]);

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
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 44px; height: 44px;">
        <div style="
          position: absolute;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(0, 102, 255, 0.25);
          animation: driverPulse 1.8s infinite ease-out;
        "></div>
        <div style="
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #0066FF;
          border: 3px solid #ffffff;
          box-shadow: 0 4px 12px rgba(0, 102, 255, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          transform: rotate(${heading}deg);
        ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
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
        zIndexOffset: 2000
      }).addTo(map);

      // Initial center on driver
      map.setView([latitude, longitude], 15);
    } else {
      driverMarkerRef.current.setLatLng([latitude, longitude]);
      const iconEl = driverMarkerRef.current.getElement();
      if (iconEl) {
        iconEl.innerHTML = selfMarkerHtml;
      }
    }

  }, [driverLocation]);

  const handleCenterOnMe = () => {
    if (mapInstance.current && driverLocation && driverLocation.latitude) {
      mapInstance.current.setView([driverLocation.latitude, driverLocation.longitude], 16, { animate: true });
    } else if (mapInstance.current && assignedRoute && assignedRoute.polyline && assignedRoute.polyline.length > 0) {
      const bounds = L.latLngBounds(assignedRoute.polyline);
      mapInstance.current.fitBounds(bounds, { padding: [30, 30] });
    }
  };

  const handleZoomIn = () => {
    if (mapInstance.current) mapInstance.current.zoomIn();
  };

  const handleZoomOut = () => {
    if (mapInstance.current) mapInstance.current.zoomOut();
  };

  return (
    <div className="driver-map-wrapper">
      <div ref={mapContainerRef} className="driver-map-canvas" />

      {/* Route Badge Overlay */}
      {assignedRoute && (
        <div className="driver-route-pill">
          <div 
            className="driver-route-num" 
            style={{ backgroundColor: assignedRoute.color && assignedRoute.color.startsWith('#') ? assignedRoute.color : '#0066FF' }}
          >
            {assignedRoute.number}
          </div>
          <div className="driver-route-info">
            <span className="driver-route-name">{assignedRoute.name}</span>
            <span className="driver-route-dir">{assignedRoute.direction || 'Marshrut chizig\'i'}</span>
          </div>
        </div>
      )}

      {/* Floating Controls */}
      <div className="driver-map-controls">
        <button className="driver-ctrl-btn" onClick={handleCenterOnMe} title="Mening joylashuvim">
          <Navigation size={18} color="#0066FF" />
        </button>
        <div className="driver-zoom-group">
          <button className="driver-ctrl-btn zoom" onClick={handleZoomIn} title="Kattalashtirish">
            <Plus size={16} />
          </button>
          <button className="driver-ctrl-btn zoom" onClick={handleZoomOut} title="Kichiklashtirish">
            <Minus size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
