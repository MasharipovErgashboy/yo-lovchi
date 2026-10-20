import React from 'react';
import { MapPin, Clock, Navigation, ChevronRight, Bus } from 'lucide-react';

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
    speed = 0,
    isUserLocationActive = false,
    arrivalStatus = 'approaching',
    carNumber = ""
  } = vehicle;

  const stopWithGa = formatStopWithGa(nextStopName || currentStopName || "Bekat");

  return (
    <div 
      className="vehicle-card"
      onClick={() => onSelectVehicle && onSelectVehicle(vehicle)}
    >
      {/* Card Header */}
      <div className="vehicle-card-header">
        <div className="vehicle-info-left">
          {/* Circular Bus/Car Icon */}
          <div className="vehicle-circle-icon" style={{ backgroundColor: arrivalStatus === 'arrived' ? '#10B981' : routeColor }}>
            <Bus size={22} color="#ffffff" />
          </div>

          <div>
            <div className="vehicle-driver-name">
              {isUserLocationActive 
                ? (arrivalStatus === 'arrived' ? 'Yoningizda' : (arrivalStatus === 'passed' ? "O'tib ketgan" : 'Sizgacha'))
                : stopWithGa}
            </div>
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
        </div>

        {/* ETA Section */}
        <div className="vehicle-eta-block">
          <div className="vehicle-eta-val" style={{ color: arrivalStatus === 'arrived' ? '#10B981' : routeColor }}>
            <Clock size={16} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-2px' }} />
            {arrivalStatus === 'arrived' ? 'Keldi' : `${etaMinutes} daq`}
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

      {/* Card Footer: Car Plate & Action */}
      <div className="vehicle-card-footer">
        <div className="vehicle-plate-pill" title="Avtomobil davlat raqami">
          <span className="plate-flag">UZ</span>
          <span className="plate-number">{carNumber || "Avtoraqam"}</span>
        </div>

        <button className="vehicle-view-btn">
          <span>Xaritada ko'rish</span>
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
