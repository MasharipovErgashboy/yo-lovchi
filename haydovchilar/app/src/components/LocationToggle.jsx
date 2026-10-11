import { Navigation } from 'lucide-react'

export default function LocationToggle({ enabled, setEnabled }) {
  const handleToggle = () => {
    if (!enabled) {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setEnabled(true);
            alert(`Joylashuv aniqlandi va tizimga yuborildi!\nKenglik: ${position.coords.latitude.toFixed(4)}\nUzunlik: ${position.coords.longitude.toFixed(4)}`);
          },
          (error) => {
            alert("Joylashuvni aniqlashda xatolik: " + error.message);
          }
        );
      } else {
        alert("Brauzeringiz joylashuvni qollab-quvvatlamaydi.");
      }
    } else {
      setEnabled(false);
    }
  };

  return (
    <div className="location-card">
      <div className="map-bg"></div>
      
      <div className="location-content">
        <div className="pulse-icon-container">
          <div className="pulse-circle-2">
            <div className="pulse-circle-3">
              <div className="pulse-icon-inner" style={{ backgroundColor: enabled ? 'var(--blue-primary)' : 'var(--text-secondary)' }}>
                <Navigation size={20} fill="currentColor" style={{ transform: 'rotate(45deg)', marginLeft: '-2px', marginBottom: '-2px' }} />
              </div>
            </div>
          </div>
        </div>
        
        <h2 className="location-title">
          {enabled ? "Joylashuv faol" : "Joylashuv o'chirilgan"}
        </h2>
        <p className="location-desc">
          {enabled 
            ? "Sizning joylashuvingiz yo'lovchilarga ko'rinmoqda" 
            : "Sizning joylashuvingiz yo'lovchilarga ko'rinmaydi"}
        </p>
        
        <button 
          className="btn-primary" 
          onClick={handleToggle}
          style={{ backgroundColor: enabled ? 'var(--red)' : 'var(--blue-primary)' }}
        >
          <Navigation size={18} fill="currentColor" style={{ transform: 'rotate(45deg)' }} />
          {enabled ? "Joylashuvni o'chirish" : "Joylashuvni yoqish"}
        </button>
      </div>
    </div>
  )
}
