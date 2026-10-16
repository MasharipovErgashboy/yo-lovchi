import React from 'react';
import { MapPin, Users, Clock, Navigation, ChevronRight, Bus } from 'lucide-react';

function formatStopWithGa(stopName) {
  if (!stopName) return "Bekatga";
  const trimmed = stopName.trim();
  const lower = trimmed.toLowerCase();
  if (lower.endsWith('ga') || lower.endsWith('ka') || lower.endsWith('qa')) {
    return trimmed;
  }
  return `${trimmed}ga`;
}

export default function VehicleCard({
  rank,
  vehicle,
  routeColor = '#0066FF',
  onSelectVehicle
}) {
  const {
    currentStopName = "Bekatda",
    nextStopName = "",
    etaMinutes = 3,
    capacity = "bosh",
    speed = 0,
    isUserLocationActive = false
  } = vehicle;

  // Capacity styling
  let capBadge = {
    text: "Bo'sh joy ko'p",
    sub: "60–70%",
    bg: "#ecfdf5",
    color: "#059669",
    border: "#a7f3d0"
  };

  if (capacity === 'tola') {
    capBadge = {
      text: "To'la",
      sub: "90–100%",
      bg: "#fef2f2",
      color: "#dc2626",
      border: "#fecaca"
    };
  } else if (capacity === 'ozroq') {
    capBadge = {
      text: "Ozroq joy bor",
      sub: "30–40%",
      bg: "#fffbeb",
      color: "#d97706",
      border: "#fde68a"
    };
  }

  // Direction word (ketmoqda / kelmoqda)
  const dirWord = (vehicle.directionText || 'Ketmoqda').toLowerCase();
  const stopWithGa = formatStopWithGa(nextStopName || currentStopName || "Bekat");
  const offlineTitle = `${stopWithGa} ${dirWord}`;

  return (
    <div 
      className="vehicle-card"
      onClick={() => onSelectVehicle && onSelectVehicle(vehicle)}
    >
      {/* Card Header */}
      <div className="vehicle-card-header">
        <div className="vehicle-info-left">
          {/* Circular Bus/Car Icon */}
          <div className="vehicle-circle-icon" style={{ backgroundColor: routeColor }}>
            <Bus size={22} color="#ffffff" />
          </div>

          <div>
            {!isUserLocationActive ? (
              <div className="vehicle-driver-name">
                <span 
                  className="live-pulsing-dot" 
                  style={{ backgroundColor: vehicle.directionColor || '#0066FF', flexShrink: 0 }}
                ></span>
                <span>{offlineTitle}</span>
              </div>
            ) : (
              <div>
                <div className="vehicle-driver-name">Sizgacha</div>
                <div className="vehicle-sub-status">
                  <span className="live-pulsing-dot" style={{ backgroundColor: vehicle.directionColor || '#0066FF' }}></span>
                  <strong style={{ color: vehicle.directionColor || '#0066FF' }}>{vehicle.directionText || 'Ketmoqda'}</strong>
                  {vehicle.userDistanceText && (
                    <span className="vehicle-distance-text">
                      • {vehicle.userDistanceText}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ETA Section (daqiqa yoziladi, ostidagi text olib tashlangan) */}
        <div className="vehicle-eta-block">
          <div className="vehicle-eta-val" style={{ color: routeColor }}>
            <Clock size={16} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-2px' }} />
            {etaMinutes} daq
          </div>
        </div>
      </div>

      {/* Stop info block: Faqat joylashuv yoqilgan paytida chiqadi */}
      {isUserLocationActive && (
        <div className="vehicle-stops-block">
          <div className="stop-row current">
            <div className="stop-row-icon">
              <MapPin size={16} color="#0066FF" />
            </div>
            <div className="stop-row-text">
              <span className="stop-row-label">Kelgan bekati:</span>
              <strong className="stop-row-val">{currentStopName}</strong>
            </div>
          </div>

          {nextStopName && (
            <div className="stop-row next">
              <div className="stop-row-icon">
                <Navigation size={14} color="#10B981" style={{ transform: 'rotate(45deg)' }} />
              </div>
              <div className="stop-row-text">
                <span className="stop-row-label">Keyingi bekat:</span>
                <strong className="stop-row-val">{nextStopName}</strong>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Card Footer: Capacity & Action */}
      <div className="vehicle-card-footer">
        <div 
          className="vehicle-capacity-pill"
          style={{ 
            backgroundColor: capBadge.bg, 
            color: capBadge.color,
            borderColor: capBadge.border
          }}
        >
          <Users size={14} />
          <span>{capBadge.text}</span>
          <span className="cap-percent">({capBadge.sub})</span>
        </div>

        <button className="vehicle-view-btn">
          <span>Xaritada ko'rish</span>
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
