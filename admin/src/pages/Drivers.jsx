import React, { useState, useEffect } from 'react';
import { User, Activity, MapPin, X, Route, Clock } from 'lucide-react';
import './PagesCommon.css';

const BACKEND_URL = "http://localhost:8000";

export default function Drivers() {
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [drivers, setDrivers] = useState([
    { id: 1, name: 'Anvar Tursunov', phone: '+998 90 111 22 33', status: 'Online', route: '12-marshrut', startTime: '07:30', endTime: null, tripsToday: 4, tripsTotal: 1250 },
    { id: 2, name: 'Bekzod Aliyev', phone: '+998 94 555 66 77', status: 'Offline', route: '15-marshrut', startTime: '08:00', endTime: '18:30', tripsToday: 8, tripsTotal: 840 },
    { id: 3, name: 'Dilmurod Karim', phone: '+998 99 888 99 00', status: 'Online', route: '18-marshrut', startTime: '09:15', endTime: null, tripsToday: 6, tripsTotal: 2100 },
    { id: 4, name: 'Hasan Hojiyev', phone: '+998 93 222 33 44', status: 'Online', route: '12-marshrut', startTime: '13:00', endTime: null, tripsToday: 2, tripsTotal: 430 },
  ]);

  useEffect(() => {
    const fetchApproved = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/drivers`);
        if (res.ok) {
          const apiDrivers = await res.json();
          if (apiDrivers && apiDrivers.length > 0) {
            const formatted = apiDrivers.map(d => ({
              id: d.id,
              name: `${d.name} ${d.surname}`,
              phone: d.phone,
              status: 'Online',
              route: 'Biriktirilmagan',
              startTime: d.updated_at ? d.updated_at.split(' ')[1] : '08:00',
              endTime: null,
              tripsToday: 0,
              tripsTotal: 0
            }));
            setDrivers(prev => {
              // Combine existing demo drivers with newly approved drivers without duplicate IDs
              const existingIds = new Set(formatted.map(f => f.id));
              return [...formatted, ...prev.filter(p => !existingIds.has(p.id))];
            });
          }
        }
      } catch (e) {
        console.error("Error fetching approved drivers:", e);
      }
    };
    fetchApproved();
    const interval = setInterval(fetchApproved, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="page-container">
      <div className="glass-card full-height">
        <div className="card-header">
          <h2>Tasdiqlangan Haydovchilar</h2>
          <span className="badge-count">{drivers.length} ta jami</span>
        </div>

        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>F.I.O</th>
                <th>Telefon raqam</th>
                <th>Holat</th>
                <th>Biriktirilgan Marshrut</th>
                <th>Amal</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map(driver => (
                <tr key={driver.id}>
                  <td>
                    <div className="td-user">
                      <div className="td-avatar"><User size={16} /></div>
                      {driver.name}
                    </div>
                  </td>
                  <td>{driver.phone}</td>
                  <td>
                    <span className={`status-badge ${driver.status === 'Online' ? 'active' : ''}`}>
                      {driver.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MapPin size={14} className="text-muted" />
                      {driver.route}
                    </div>
                  </td>
                  <td>
                    <button 
                      className="action-btn"
                      onClick={() => setSelectedDriver(driver)}
                    >
                      <Activity size={16} /> Faoliyati
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Faoliyati Modal */}
      {selectedDriver && (
        <div className="modal-overlay" onClick={() => setSelectedDriver(null)}>
          <div className="modal-content glass-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h3>Haydovchi faoliyati</h3>
              <button className="close-btn" onClick={() => setSelectedDriver(null)}><X size={24} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className="cand-profile">
                <div className="cand-avatar large" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)' }}>
                  <User size={40} />
                </div>
                <h2>{selectedDriver.name}</h2>
                <div className="cand-phone" style={{ marginBottom: '16px' }}>
                  {selectedDriver.phone}
                </div>
                <span className={`status-badge ${selectedDriver.status === 'Online' ? 'active' : ''}`} style={{ fontSize: '14px' }}>
                  {selectedDriver.status}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Activity size={14} color="#f59e0b" /> Ish smenasi
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: '600', lineHeight: '1.5' }}>
                    Boshladi: {selectedDriver.startTime} <br/>
                    Tugatdi: {selectedDriver.endTime ? selectedDriver.endTime : <span style={{color: '#10b981'}}>Hozir ishda</span>}
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Route size={14} color="var(--primary)" /> Marshrut
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{selectedDriver.route}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={14} color="#10b981" /> Bugun qilingan reyslar
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{selectedDriver.tripsToday} ta</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Activity size={14} color="#8b5cf6" /> Umumiy reyslar
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{selectedDriver.tripsTotal} ta</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
