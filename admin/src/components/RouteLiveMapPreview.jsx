import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Loader2, Navigation, Sparkles, MapPin, ArrowRight, ArrowLeft } from 'lucide-react';

const BACKEND_URL = "";

export default function RouteLiveMapPreview({
  stops = [],
  routeColor = '#3b82f6',
  arrowColorForward = '#0066FF',
  arrowColorBackward = '#10B981',
  onPolylinesCalculated,
  initialForwardPolyline = [],
  initialReturnPolyline = []
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layersGroupRef = useRef(null);

  const [isCalculating, setIsCalculating] = useState(false);
  const [forwardPolyline, setForwardPolyline] = useState(initialForwardPolyline || []);
  const [returnPolyline, setReturnPolyline] = useState(initialReturnPolyline || []);
  const [parsedStops, setParsedStops] = useState([]);

  // 1. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      attributionControl: false
    }).setView([40.7821, 72.3442], 13); // Default Andijan center

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(map);

    layersGroupRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    const t = setTimeout(() => {
      try {
        map.invalidateSize();
      } catch (e) {}
    }, 300);

    return () => {
      clearTimeout(t);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 2. Fetch OSRM road polylines (Forward + Return) whenever stops change
  useEffect(() => {
    const validCount = stops.filter(s => s && s.raw && s.raw.trim().length > 0).length;
    if (validCount < 2) {
      setForwardPolyline([]);
      setReturnPolyline([]);
      setParsedStops([]);
      if (onPolylinesCalculated) {
        onPolylinesCalculated([], []);
      }
      return;
    }

    const timer = setTimeout(async () => {
      setIsCalculating(true);
      try {
        const res = await fetch(`${BACKEND_URL}/api/routes/preview-polyline`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stops })
        });
        if (res.ok) {
          const data = await res.json();
          const fPoly = data.polyline || [];
          const rPoly = data.return_polyline || [];
          setForwardPolyline(fPoly);
          setReturnPolyline(rPoly);
          setParsedStops(data.stops || []);

          if (onPolylinesCalculated) {
            onPolylinesCalculated(fPoly, rPoly);
          }
        }
      } catch (err) {
        console.warn("Failed to preview route polylines:", err);
      } finally {
        setIsCalculating(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [stops]);

  // 3. Render polylines and stop markers on map
  useEffect(() => {
    if (!mapInstanceRef.current || !layersGroupRef.current) return;
    const map = mapInstanceRef.current;
    const group = layersGroupRef.current;
    group.clearLayers();

    const allLatLngs = [];

    // A. Draw Forward Line (Borish chizig'i)
    if (forwardPolyline && forwardPolyline.length >= 2) {
      // Glow
      L.polyline(forwardPolyline, {
        color: arrowColorForward || '#0066FF',
        weight: 10,
        opacity: 0.25,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(group);

      // Main Line
      L.polyline(forwardPolyline, {
        color: arrowColorForward || '#0066FF',
        weight: 5,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round'
      }).bindPopup(`
        <div style="font-family: sans-serif; font-size: 13px; font-weight: 600; color: #1e293b; padding: 4px;">
          <strong style="color: ${arrowColorForward};">Borish yo'nalishi</strong> (Bosh bekat → Oxirgi bekat)
        </div>
      `).addTo(group);

      forwardPolyline.forEach(pt => allLatLngs.push([pt[0], pt[1]]));
    }

    // B. Draw Automatic Return Line (Qaytish chizig'i)
    if (returnPolyline && returnPolyline.length >= 2) {
      // Glow
      L.polyline(returnPolyline, {
        color: arrowColorBackward || '#10B981',
        weight: 10,
        opacity: 0.25,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(group);

      // Main Return Line (Distinct dashed line for easy contrast)
      L.polyline(returnPolyline, {
        color: arrowColorBackward || '#10B981',
        weight: 5,
        opacity: 0.95,
        dashArray: '7, 8',
        lineCap: 'round',
        lineJoin: 'round'
      }).bindPopup(`
        <div style="font-family: sans-serif; font-size: 13px; font-weight: 600; color: #1e293b; padding: 4px;">
          <strong style="color: ${arrowColorBackward};">Qaytish yo'nalishi (Avtomatik)</strong> (Oxirgi bekat → Bosh bekat)
        </div>
      `).addTo(group);

      returnPolyline.forEach(pt => allLatLngs.push([pt[0], pt[1]]));
    }

    // C. Draw Stop Markers
    if (parsedStops && parsedStops.length > 0) {
      const validStops = parsedStops.filter(s => s.lat != null && s.lng != null);

      validStops.forEach((stop, idx) => {
        const isFirst = idx === 0;
        const isLast = idx === validStops.length - 1;

        allLatLngs.push([stop.lat, stop.lng]);

        const markerHtml = `
          <div class="route-preview-stop-pin ${isFirst ? 'is-start' : isLast ? 'is-end' : 'is-mid'}" style="
            background: ${isFirst ? '#3b82f6' : isLast ? '#ef4444' : '#1e293b'};
            border: 2px solid #ffffff;
            box-shadow: 0 4px 12px rgba(0,0,0,0.4);
            width: ${isFirst || isLast ? '28px' : '22px'};
            height: ${isFirst || isLast ? '28px' : '22px'};
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            font-size: ${isFirst || isLast ? '12px' : '10px'};
            font-weight: 800;
            font-family: sans-serif;
          ">
            ${idx + 1}
          </div>
        `;

        const marker = L.marker([stop.lat, stop.lng], {
          icon: L.divIcon({
            className: 'route-preview-stop-marker-wrap',
            html: markerHtml,
            iconSize: [28, 28],
            iconAnchor: [14, 14]
          }),
          zIndexOffset: isFirst || isLast ? 1000 : 500
        });

        marker.bindPopup(`
          <div style="font-family: sans-serif; font-size: 13px; color: #1e293b; padding: 4px 6px;">
            <div style="font-weight: 700; margin-bottom: 2px;">
              ${idx + 1}-bekat: ${stop.name || `Bekat ${idx + 1}`}
            </div>
            ${isFirst ? '<span style="color: #3b82f6; font-size: 11px; font-weight: 700;">🟢 Bosh bekat</span>' : ''}
            ${isLast ? '<span style="color: #ef4444; font-size: 11px; font-weight: 700;">🔴 Oxirgi bekat</span>' : ''}
          </div>
        `);

        marker.addTo(group);
      });
    }

    // D. Fit bounds if points exist
    if (allLatLngs.length >= 2) {
      try {
        const bounds = L.latLngBounds(allLatLngs);
        map.fitBounds(bounds, { padding: [35, 35] });
      } catch (e) {}
    }

    setTimeout(() => {
      try { map.invalidateSize(); } catch(e) {}
    }, 100);

  }, [forwardPolyline, returnPolyline, parsedStops, arrowColorForward, arrowColorBackward]);

  const hasLines = forwardPolyline.length >= 2 || returnPolyline.length >= 2;

  return (
    <div className="route-map-preview-card">
      <div className="route-map-preview-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="preview-header-icon">
            <Navigation size={16} />
          </div>
          <div>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
              Xaritada Marshrut Chizig'i
            </span>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Borish va avtomatik qaytish yo'llari jonli ko'rinishi
            </div>
          </div>
        </div>

        {isCalculating ? (
          <div className="preview-status-badge calculating">
            <Loader2 size={13} className="animate-spin" />
            <span>Chizilmoqda...</span>
          </div>
        ) : hasLines ? (
          <div className="preview-status-badge active">
            <Sparkles size={13} />
            <span>Avtomatik chizildi</span>
          </div>
        ) : (
          <div className="preview-status-badge waiting">
            <MapPin size={13} />
            <span>Bekatlar kutilmoqda</span>
          </div>
        )}
      </div>

      {/* Map Viewport */}
      <div className="route-map-viewport-wrapper">
        <div ref={mapContainerRef} className="route-map-viewport" />

        {!hasLines && !isCalculating && (
          <div className="route-map-empty-overlay">
            <div className="empty-overlay-content">
              <Navigation size={28} style={{ opacity: 0.5, marginBottom: '8px' }} />
              <strong>Chiziqlar kutilmoqda</strong>
              <p>Chap tarafdagi bekatlar kordinatalarini kiriting. Tizim borish va qaytish chizig'ini avtomatik chizib beradi.</p>
            </div>
          </div>
        )}
      </div>

      {/* Legend & Stats */}
      <div className="route-map-preview-legend">
        <div className="legend-item forward">
          <span className="legend-line-sample" style={{ background: arrowColorForward || '#0066FF' }}></span>
          <span className="legend-text">
            <ArrowRight size={13} /> Borish chizig'i (Bosh → Oxirgi)
          </span>
        </div>

        <div className="legend-item backward">
          <span className="legend-line-sample dashed" style={{ borderColor: arrowColorBackward || '#10B981' }}></span>
          <span className="legend-text">
            <ArrowLeft size={13} /> Qaytish chizig'i (Avtomatik)
          </span>
        </div>

        <div className="legend-item stops-count">
          <MapPin size={13} color="var(--primary)" />
          <span>{parsedStops.filter(s => s.lat && s.lng).length} ta bekat</span>
        </div>
      </div>
    </div>
  );
}
