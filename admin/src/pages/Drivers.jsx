import React, { useState, useEffect } from 'react';
import { User, Activity, MapPin, X, Route, Clock, Car, Loader2, RefreshCw, Trash2, AlertTriangle } from 'lucide-react';
import './PagesCommon.css';

const BACKEND_URL = "http://localhost:8000";

export default function Drivers() {
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [driverToDelete, setDriverToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchApproved = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/drivers`);
      if (res.ok) {
        const apiDrivers = await res.json();
        const formatted = (apiDrivers || []).map(d => ({
          id: d.id,
          name: `${d.name} ${d.surname}`,
          phone: d.phone,
          status: 'Online',
          route: 'Biriktirilmagan',
          startTime: d.updated_at ? (d.updated_at.includes(' ') ? d.updated_at.split(' ')[1] : d.updated_at) : '08:00',
          endTime: null,
          tripsToday: 0,
          tripsTotal: 0
        }));
        setDrivers(formatted);
      }
    } catch (e) {
      console.error("Haydovchilarni yuklashda xatolik:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDriver = async () => {
    if (!driverToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/drivers/${driverToDelete.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setDriverToDelete(null);
        await fetchApproved();
      } else {
        alert("Haydovchini o'chirishda xatolik yuz berdi!");
      }
    } catch (err) {
      console.error("Delete driver error:", err);
      alert("Server bilan bog'lanishda xatolik yuz berdi!");
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    fetchApproved();
    // 4 soniyada bir avtomatik yangilash (Polling)
    const interval = setInterval(fetchApproved, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="page-container">
      <div className="glass-card full-height">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h2>Tasdiqlangan Haydovchilar</h2>
            <button 
              onClick={fetchApproved} 
              className="action-btn"
              style={{ width: '32px', height: '32px', padding: 0 }}
              title="Yangilash"
            >
              <RefreshCw size={14} />
            </button>
          </div>
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
              {loading ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <Loader2 className="animate-spin" size={18} /> Yuklanmoqda...
                    </div>
                  </td>
                </tr>
              ) : drivers.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                    <Car size={36} style={{ margin: '0 auto 12px', opacity: 0.3, display: 'block' }} />
                    Hozircha tasdiqlangan haydovchilar mavjud emas.
                  </td>
                </tr>
              ) : (
                drivers.map(driver => (
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button 
                          className="action-btn"
                          onClick={() => setSelectedDriver(driver)}
                        >
                          <Activity size={16} /> Faoliyati
                        </button>
                        <button 
                          className="action-btn danger-btn"
                          onClick={() => setDriverToDelete(driver)}
                          title="Haydovchini tizimdan o'chirish"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
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

      {/* O'chirishni Tasdiqlash Modali */}
      {driverToDelete && (
        <div className="modal-overlay" onClick={() => !isDeleting && setDriverToDelete(null)}>
          <div className="modal-content glass-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444' }}>
                <AlertTriangle size={20} /> Haydovchini o'chirish
              </h3>
              <button className="close-btn" onClick={() => !isDeleting && setDriverToDelete(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ color: 'var(--text-main)', fontSize: '15px', lineHeight: '1.6', margin: 0 }}>
                Haqiqatan ham <strong>{driverToDelete.name}</strong> ({driverToDelete.phone})ni tizimdan o'chirmoqchimisiz?
              </p>
              <div style={{ background: 'rgba(239, 68, 68, 0.08)', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#f87171', fontSize: '13px', lineHeight: '1.5' }}>
                ⚠️ Haydovchi mini ilovadan avtomatik chiqariladi, Telegram botidagi "Ilovani ochish" tugmasi olib tashlanadi va bot boshlang'ich ro'yxatdan o'tish holatiga qaytariladi.
              </div>
            </div>
            <div className="modal-footer" style={{ padding: '16px 24px' }}>
              <button 
                type="button"
                className="action-btn"
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => setDriverToDelete(null)}
                disabled={isDeleting}
              >
                Bekor qilish
              </button>
              <button 
                type="button"
                className="btn-reject"
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={handleDeleteDriver}
                disabled={isDeleting}
              >
                {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                {isDeleting ? "O'chirilmoqda..." : "Ha, o'chirish"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

