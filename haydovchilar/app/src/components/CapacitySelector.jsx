import { Users, Info } from 'lucide-react'

export default function CapacitySelector({ selected, onSelect }) {
  return (
    <div className="capacity-card">
      <div className="section-title">Mashina holati</div>
      
      <div className="capacity-grid">
        <div 
          className={`capacity-option bosh ${selected === 'bosh' ? 'selected' : ''}`}
          onClick={() => onSelect('bosh')}
        >
          <div className="radio-circle"></div>
          <div className="capacity-content">
            <Users className="capacity-icon" size={24} color="var(--green)" />
            <div className="capacity-text-wrap">
              <div className="capacity-title" style={{ color: 'var(--green)' }}>Bo'sh joy<br/>ko'p</div>
              <div className="capacity-desc">60-70%</div>
            </div>
          </div>
        </div>

        <div 
          className={`capacity-option ozroq ${selected === 'ozroq' ? 'selected' : ''}`}
          onClick={() => onSelect('ozroq')}
        >
          <div className="radio-circle"></div>
          <div className="capacity-content">
            <Users className="capacity-icon" size={24} color="var(--orange)" />
            <div className="capacity-text-wrap">
              <div className="capacity-title" style={{ color: 'var(--orange)' }}>Ozroq<br/>joy bor</div>
              <div className="capacity-desc">30-40%</div>
            </div>
          </div>
        </div>

        <div 
          className={`capacity-option tola ${selected === 'tola' ? 'selected' : ''}`}
          onClick={() => onSelect('tola')}
        >
          <div className="radio-circle"></div>
          <div className="capacity-content">
            <Users className="capacity-icon" size={24} color="var(--red)" />
            <div className="capacity-text-wrap">
              <div className="capacity-title" style={{ color: 'var(--red)' }}>To'la<br/>&nbsp;</div>
              <div className="capacity-desc">90-100%</div>
            </div>
          </div>
        </div>
      </div>

      <div className="info-box">
        <Info size={16} />
        Mashina holatini o'zgartirsangiz, yo'lovchilar real vaqtda ko'radi.
      </div>
    </div>
  )
}
