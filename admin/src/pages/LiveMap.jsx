import React from 'react';
import { Map as MapIcon, Navigation } from 'lucide-react';
import './PagesCommon.css';

export default function LiveMap() {
  return (
    <div className="page-container full-height" style={{ padding: 0 }}>
      <div className="glass-card full-height" style={{ position: 'relative', overflow: 'hidden', padding: 0, border: 'none' }}>
        
        {/* Mock Map Background */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'url("https://www.transparenttextures.com/patterns/cubes.png") #0f172a',
          opacity: 0.8,
          zIndex: 0
        }}></div>

        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          zIndex: 1,
          color: 'var(--text-muted)'
        }}>
          <MapIcon size={64} style={{ opacity: 0.2, marginBottom: '16px' }} />
          <h2>Xarita yuklanmoqda...</h2>
          <p>Tez orada haqiqiy xarita xizmati ulanadi.</p>
        </div>

        {/* Mock Drivers on Map */}
        <div style={{ position: 'absolute', top: '30%', left: '40%', zIndex: 2 }}>
          <div className="map-marker">
            <span className="bus-icon">🚌</span>
            <span className="route-num">12</span>
          </div>
        </div>
        <div style={{ position: 'absolute', top: '45%', left: '60%', zIndex: 2 }}>
          <div className="map-marker">
            <span className="bus-icon">🚌</span>
            <span className="route-num">15</span>
          </div>
        </div>
        <div style={{ position: 'absolute', top: '60%', left: '35%', zIndex: 2 }}>
          <div className="map-marker">
            <span className="bus-icon">🚌</span>
            <span className="route-num">18</span>
          </div>
        </div>

        {/* Floating Panel */}
        <div style={{
          position: 'absolute',
          top: '24px',
          left: '24px',
          zIndex: 10,
          background: 'rgba(15, 23, 42, 0.8)',
          backdropFilter: 'blur(12px)',
          padding: '20px',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          minWidth: '250px'
        }}>
          <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Navigation size={18} color="var(--primary)" />
            Faol haydovchilar
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>12-marshrut:</span>
              <span style={{ fontWeight: 'bold' }}>14 ta</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>15-marshrut:</span>
              <span style={{ fontWeight: 'bold' }}>8 ta</span>
            </div>
          </div>
        </div>

      </div>

      <style>{`
        .map-marker {
          background: var(--primary);
          padding: 6px 12px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          gap: 6px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.5);
          cursor: pointer;
          transition: transform 0.2s;
          border: 2px solid white;
        }
        .map-marker:hover {
          transform: scale(1.1) translateY(-5px);
        }
        .bus-icon { font-size: 16px; }
        .map-marker .route-num { font-weight: bold; color: white; }
      `}</style>
    </div>
  )
}
