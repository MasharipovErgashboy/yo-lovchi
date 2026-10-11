import { MapPin, Users, Bus, ChevronRight } from 'lucide-react';

export default function RouteCard({ 
  number, 
  color, 
  name, 
  direction, 
  eta, 
  currentStop, 
  totalStops, 
  capacity, 
  capacityPercent, 
  activeBuses 
}) {
  const progressPercent = ((currentStop - 1) / (totalStops - 1)) * 100;
  
  // Array of dots to render the timeline
  const dots = Array.from({ length: totalStops });

  const getCapacityColor = () => {
    if (capacity.includes("Bo'sh") || capacity.includes("bo'sh")) return "var(--route-green)";
    if (capacity.includes("Ozroq") || capacity.includes("ozroq")) return "var(--route-orange)";
    return "var(--route-pink)";
  };

  return (
    <div className="route-card">
      <div className="card-header">
        <div className="route-info">
          <div className="route-number" style={{ backgroundColor: color }}>
            {number}
          </div>
          <div>
            <div className="route-name">{name}</div>
            <div className="route-direction">{direction}</div>
          </div>
        </div>
        <div className="eta-info">
          <div className="eta-time" style={{ color }}>
            {eta} daq <ChevronRight size={18} color="var(--text-secondary)" />
          </div>
          <div className="eta-text">yetib keladi</div>
        </div>
      </div>

      <div className="timeline-container">
        <div className="timeline-line"></div>
        <div 
          className="timeline-line-active" 
          style={{ width: `${progressPercent}%`, backgroundColor: color }}
        ></div>
        
        <div className="timeline-stops">
          {dots.map((_, index) => (
            <div 
              key={index} 
              className={`stop-dot ${index < currentStop ? 'active' : ''}`}
              style={{ backgroundColor: index < currentStop ? color : '#E5E7EB' }}
            ></div>
          ))}
        </div>
        
        <div 
          className="bus-icon-container" 
          style={{ left: `${progressPercent}%`, backgroundColor: color }}
        >
          <Bus size={12} color="#fff" />
        </div>
      </div>

      <div className="card-footer">
        <div className="footer-item">
          <MapPin className="footer-icon" size={16} />
          <div>
            <div className="footer-text-main">{currentStop}-bekat</div>
            <div className="footer-text-sub">Sizga yaqin</div>
          </div>
        </div>
        <div className="footer-item">
          <Users className="footer-icon" size={16} style={{ color: getCapacityColor() }} />
          <div>
            <div className="footer-text-main" style={{ color: getCapacityColor() }}>{capacity}</div>
            <div className="footer-text-sub">{capacityPercent}</div>
          </div>
        </div>
        <div className="footer-item">
          <Bus className="footer-icon" size={16} />
          <div>
            <div className="footer-text-main">{activeBuses} ta avtobus</div>
            <div className="footer-text-sub">Harakatda</div>
          </div>
        </div>
      </div>
    </div>
  );
}
