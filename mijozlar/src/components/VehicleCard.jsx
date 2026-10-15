import React from 'react';
import { MapPin, Users, Clock, Navigation, ChevronRight } from 'lucide-react';

export default function VehicleCard({
  rank,
  vehicle,
  routeColor = '#0066FF',
  onSelectVehicle
}) {
  const {
    driverName = "Haydovchi",
    routeNumber = "1",
    routeName = "1-marshrut",
    currentStopName = "Bekatda",
    nextStopName = "",
    etaMinutes = 3,
    capacity = "bosh",
    speed = 0
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

  return (
    <div 
      className="vehicle-card"
      onClick={() => onSelectVehicle && onSelectVehicle(vehicle)}
    >
      {/* Card Header */}
      <div className="vehicle-card-header">
        <div className="vehicle-info-left">
          <div className="vehicle-badge-stack">
            <div className="vehicle-route-num" style={{ backgroundColor: routeColor }}>
              {routeNumber}
            </div>
            {rank === 1 && (
              <span className="vehicle-rank-tag">Eng yaqin</span>
            )}
          </div>
          <div>
            <div className="vehicle-driver-name">{driverName}</div>
            <div className="vehicle-sub-status">
              <span className="live-pulsing-dot" style={{ backgroundColor: vehicle.directionColor || '#0066FF' }}></span>
              {routeName} • <strong style={{ color: vehicle.directionColor || '#0066FF' }}>{vehicle.directionText || 'Ketmoqda'}</strong>
            </div>
          </div>
        </div>

        {/* ETA Section */}
        <div className="vehicle-eta-block">
          <div className="vehicle-eta-val" style={{ color: routeColor }}>
            <Clock size={16} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-2px' }} />
            {etaMinutes} daq
          </div>
          <div className="vehicle-eta-sub">yetib boradi</div>
        </div>
      </div>

      {/* Stop info block */}
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
