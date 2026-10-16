import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { User, Activity, MapPin, X, Route, Clock, Car, Loader2, Trash2, AlertTriangle, MessageSquare, Send, CheckCircle2 } from 'lucide-react';
import './PagesCommon.css';

const BACKEND_URL = "";

export default function Drivers() {
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [driverToDelete, setDriverToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Xabar yuborish modali holati
  const [driverToMessage, setDriverToMessage] = useState(null);
  const [msgTitle, setMsgTitle] = useState('');
  const [msgContent, setMsgContent] = useState('');
  const [msgType, setMsgType] = useState('system');
  const [isSendingMsg, setIsSendingMsg] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);

  // Marshrut biriktirish holati
  const [availableRoutes, setAvailableRoutes] = useState([]);
  const [driverToAssignRoute, setDriverToAssignRoute] = useState(null);
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [isAssigningRoute, setIsAssigningRoute] = useState(false);

  const fetchRoutes = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/routes`);
      if (res.ok) {
        const data = await res.json();
        setAvailableRoutes(data || []);
      }
    } catch (e) {
      console.error("Marshrutlarni yuklashda xatolik:", e);
    }
  };

  const formatShiftTime = (timeStr) => {
    if (!timeStr) return null;
    try {
      const parts = timeStr.trim().split(' ');
      if (parts.length > 1) {
        return parts[1];
      }
      return timeStr;
    } catch {
      return timeStr;
    }
  };

  const fetchApproved = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/drivers`);
      if (res.ok) {
        const apiDrivers = await res.json();
        const formatted = (apiDrivers || []).map(d => {
          const hasAssignedRoute = Boolean(d.assigned_route_id);
          const isOnline = Boolean(d.is_online) && hasAssignedRoute;

          // Real shift start time
          let startTime = 'Boshlanmagan';
          if (d.shift_started_at) {
            startTime = formatShiftTime(d.shift_started_at);
          }

          // Real shift end time
          let endTime = null;
          if (isOnline) {
            endTime = null; // Will show "Hozir ishda" (green)
          } else if (d.shift_ended_at) {
            endTime = formatShiftTime(d.shift_ended_at);
          } else if (d.shift_started_at) {
            endTime = 'Tugatilgan';
          } else {
            endTime = '-';
          }

          // Real route display
          let routeDisplay = 'Biriktirilmagan';
          if (d.route_number) {
            routeDisplay = `${d.route_number}-marshrut` + (d.route_name ? ` (${d.route_name})` : '');
          }

          return {
            id: d.id,
            telegram_id: d.telegram_id,
            name: d.name,
            car_number: d.car_number || d.surname || '',
            phone: d.phone,
            status: isOnline ? 'Online' : 'Offline',
            assigned_route_id: d.assigned_route_id,
            routeNumber: d.route_number,
            routeName: d.route_name,
            routeColor: d.route_color,
            route: routeDisplay,
            routeDisplay: routeDisplay,
            startTime: startTime,
            endTime: endTime,
            tripsToday: d.trips_today ?? 0,
            tripsTotal: d.trips_total ?? 0,
            created_at: d.created_at,
            updated_at: d.updated_at
          };
        });
        setDrivers(formatted);

        // Keep open modal updated live with new coordinates/shift/trips
        setSelectedDriver(prev => {
          if (!prev) return null;
          const found = formatted.find(item => item.id === prev.id);
          return found || prev;
        });
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

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!driverToMessage) return;
    if (!msgTitle.trim() || !msgContent.trim()) {
      alert("Iltimos, xabar mavzusi va matnini to'liq kiriting!");
      return;
    }

    setIsSendingMsg(true);
    try {
      const payload = {
        title: msgTitle.trim(),
        message: msgContent.trim(),
        type: msgType,
        target_type: 'single',
        driver_id: driverToMessage.id
      };

      const res = await fetch(`${BACKEND_URL}/api/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setSendSuccess(true);
        setTimeout(() => {
          setSendSuccess(false);
          setDriverToMessage(null);
          setMsgTitle('');
          setMsgContent('');
          setMsgType('system');
        }, 1200);
      } else {
        alert("Xabar yuborishda xatolik yuz berdi!");
      }
    } catch (err) {
      console.error("Xabar yuborishda xatolik:", err);
      alert("Server bilan bog'lanishda xatolik yuz berdi!");
    } finally {
      setIsSendingMsg(false);
    }
  };

  const handleAssignRoute = async (e) => {
    e.preventDefault();
    if (!driverToAssignRoute) return;
    setIsAssigningRoute(true);
    try {
      const payload = {
        route_id: selectedRouteId ? parseInt(selectedRouteId) : null
      };
      const res = await fetch(`${BACKEND_URL}/api/drivers/${driverToAssignRoute.id}/assign-route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setDriverToAssignRoute(null);
        await fetchApproved();
      } else {
        alert("Marshrutni biriktirishda xatolik yuz berdi!");
      }
    } catch (err) {
      console.error("Assign route error:", err);
      alert("Server bilan bog'lanishda xatolik yuz berdi!");
    } finally {
      setIsAssigningRoute(false);
    }
  };

  useEffect(() => {
    fetchApproved();
    fetchRoutes();
    // 4 soniyada bir avtomatik yangilash (Polling)
    const interval = setInterval(fetchApproved, 4000);
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
                <th>Ism</th>
                <th>Avtomobil raqami</th>
                <th>Telefon raqam</th>
                <th>Holat</th>
                <th>Biriktirilgan Marshrut</th>
                <th>Amal</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <Loader2 className="animate-spin" size={18} /> Yuklanmoqda...
                    </div>
                  </td>
                </tr>
              ) : drivers.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
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
                    <td>
                      <span style={{ 
                        fontWeight: '700', 
                        fontFamily: 'monospace', 
                        background: 'rgba(255,255,255,0.08)', 
                        padding: '4px 8px', 
                        borderRadius: '6px', 
                        border: '1px solid rgba(255,255,255,0.12)' 
                      }}>
                        {driver.car_number || '—'}
                      </span>
                    </td>
                    <td>{driver.phone}</td>
                    <td>
                      <span className={`status-badge ${driver.status === 'Online' ? 'active' : ''}`}>
                        {driver.status}
                      </span>
                    </td>
                    <td>
                      <button 
                        className="action-btn"
                        style={{ 
                          borderColor: driver.routeColor ? `${driver.routeColor}66` : 'rgba(255,255,255,0.1)',
                          color: driver.routeColor || 'var(--text-main)',
                          fontSize: '13px',
                          padding: '4px 10px',
                          borderRadius: '8px',
                          gap: '6px'
                        }}
                        onClick={() => {
                          setDriverToAssignRoute(driver);
                          setSelectedRouteId(driver.assigned_route_id ? String(driver.assigned_route_id) : '');
                        }}
                        title="Marshrutni biriktirish yoki o'zgartirish"
                      >
                        <Route size={14} />
                        {driver.routeDisplay}
                      </button>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button 
                          className="action-btn"
                          style={{ color: '#8b5cf6', borderColor: 'rgba(139, 92, 246, 0.3)' }}
                          onClick={() => {
                            setDriverToAssignRoute(driver);
                            setSelectedRouteId(driver.assigned_route_id ? String(driver.assigned_route_id) : '');
                          }}
                          title="Marshrutga biriktirish"
                        >
                          <Route size={16} /> Marshrut
                        </button>
                        <button 
                          className="action-btn"
                          onClick={() => setSelectedDriver(driver)}
                        >
                          <Activity size={16} /> Faoliyati
                        </button>
                        <button 
                          className="action-btn"
                          style={{ color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.3)' }}
                          onClick={() => {
                            setDriverToMessage(driver);
                            setMsgTitle('');
                            setMsgContent('');
                            setMsgType('system');
                            setSendSuccess(false);
                          }}
                          title="Haydovchiga xabar yuborish"
                        >
                          <MessageSquare size={16} /> Xabar
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
      {selectedDriver && typeof document !== 'undefined' && createPortal(
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
                <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--primary, #3b82f6)', marginTop: '4px', marginBottom: '8px' }}>
                  🚗 Avtomobil raqami: {selectedDriver.car_number || '—'}
                </div>
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
                  <div style={{ fontSize: '15px', fontWeight: 'bold', lineHeight: '1.4', color: selectedDriver.routeNumber ? 'var(--text-main)' : 'var(--text-muted)' }}>
                    {selectedDriver.route || 'Biriktirilmagan'}
                  </div>
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
        </div>,
        document.body
      )}

      {/* O'chirishni Tasdiqlash Modali */}
      {driverToDelete && typeof document !== 'undefined' && createPortal(
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
                Haqiqatan ham <strong>{driverToDelete.name}</strong> {driverToDelete.car_number ? `(${driverToDelete.car_number})` : ''} ({driverToDelete.phone})ni tizimdan o'chirmoqchimisiz?
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
        </div>,
        document.body
      )}

      {/* Muayyan Haydovchiga Xabar Yuborish Modali */}
      {driverToMessage && typeof document !== 'undefined' && createPortal(
        <div className="modal-overlay" onClick={() => !isSendingMsg && setDriverToMessage(null)}>
          <div className="modal-content glass-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <div>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8' }}>
                  <MessageSquare size={20} /> Xabar yuborish
                </h3>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {driverToMessage.name} {driverToMessage.car_number ? `(${driverToMessage.car_number})` : ''} • {driverToMessage.phone}
                </div>
              </div>
              <button className="close-btn" onClick={() => !isSendingMsg && setDriverToMessage(null)}>
                <X size={20} />
              </button>
            </div>

            {sendSuccess ? (
              <div style={{ padding: '36px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle2 size={28} />
                </div>
                <h4 style={{ margin: 0, fontSize: '16px', color: '#10b981' }}>Xabar yuborildi!</h4>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
                  Haydovchiga mini ilova va Telegram boti orqali yetkazildi.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSendMessage}>
                <div className="modal-body" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '500' }}>
                      Xabar turi
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => setMsgType('system')}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: msgType === 'system' ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.1)',
                          background: msgType === 'system' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.02)',
                          color: msgType === 'system' ? '#60a5fa' : 'var(--text-muted)',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        Tizim
                      </button>
                      <button
                        type="button"
                        onClick={() => setMsgType('alert')}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: msgType === 'alert' ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.1)',
                          background: msgType === 'alert' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.02)',
                          color: msgType === 'alert' ? '#f87171' : 'var(--text-muted)',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        Ogohlantirish
                      </button>
                      <button
                        type="button"
                        onClick={() => setMsgType('info')}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: msgType === 'info' ? '1px solid #06b6d4' : '1px solid rgba(255,255,255,0.1)',
                          background: msgType === 'info' ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255,255,255,0.02)',
                          color: msgType === 'info' ? '#22d3ee' : 'var(--text-muted)',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        Ma'lumot
                      </button>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '500' }}>
                      Sarlavha (Mavzu)
                    </label>
                    <input 
                      type="text"
                      className="custom-input"
                      placeholder="Masalan: Reys jadvali o'zgarishi"
                      value={msgTitle}
                      onChange={e => setMsgTitle(e.target.value)}
                      required
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '500' }}>
                      Xabar matni
                    </label>
                    <textarea 
                      className="custom-textarea"
                      placeholder="Haydovchiga yetkaziladigan xabar matnini kiriting..."
                      rows={4}
                      value={msgContent}
                      onChange={e => setMsgContent(e.target.value)}
                      required
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div className="modal-footer" style={{ padding: '16px 24px' }}>
                  <button 
                    type="button"
                    className="action-btn"
                    style={{ flex: 1, justifyContent: 'center' }}
                    onClick={() => setDriverToMessage(null)}
                    disabled={isSendingMsg}
                  >
                    Bekor qilish
                  </button>
                  <button 
                    type="submit"
                    className="action-btn"
                    style={{
                      flex: 1,
                      justifyContent: 'center',
                      background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                      border: 'none',
                      color: '#fff',
                      fontWeight: '600'
                    }}
                    disabled={isSendingMsg}
                  >
                    {isSendingMsg ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    {isSendingMsg ? "Yuborilmoqda..." : "Yuborish"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Marshrutga biriktirish Modali */}
      {driverToAssignRoute && typeof document !== 'undefined' && createPortal(
        <div className="modal-overlay" onClick={() => setDriverToAssignRoute(null)}>
          <div className="modal-content glass-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Route size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '17px' }}>Marshrutga biriktirish</h3>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>{driverToAssignRoute.name}</p>
                </div>
              </div>
              <button className="close-btn" onClick={() => setDriverToAssignRoute(null)}><X size={24} /></button>
            </div>

            <form onSubmit={handleAssignRoute}>
              <div className="modal-body" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '500' }}>
                    Qaysi marshrutga biriktirilsin?
                  </label>
                  <select
                    className="custom-input"
                    value={selectedRouteId}
                    onChange={e => setSelectedRouteId(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  >
                    <option value="">-- Biriktirilmagan (marshrutdan yechish) --</option>
                    {availableRoutes.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.number}-marshrut: {r.name} {r.direction ? `(${r.direction})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedRouteId && (
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', fontSize: '13px' }}>
                    <div style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>Tanlangan marshrut:</div>
                    {(() => {
                      const found = availableRoutes.find(r => String(r.id) === String(selectedRouteId));
                      if (!found) return null;
                      return (
                        <div>
                          <strong style={{ color: found.color && found.color.startsWith('#') ? found.color : 'var(--primary)' }}>
                            {found.number}-marshrut: {found.name}
                          </strong>
                          <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px' }}>
                            Bekatlar soni: {found.stops ? found.stops.length : 0} ta
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              <div className="modal-footer" style={{ padding: '16px 24px' }}>
                <button 
                  type="button"
                  className="action-btn"
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => setDriverToAssignRoute(null)}
                  disabled={isAssigningRoute}
                >
                  Bekor qilish
                </button>
                <button 
                  type="submit"
                  className="action-btn"
                  style={{
                    flex: 1,
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                    border: 'none',
                    color: '#fff',
                    fontWeight: '600'
                  }}
                  disabled={isAssigningRoute}
                >
                  {isAssigningRoute ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  {isAssigningRoute ? "Saqlanmoqda..." : "Saqlash"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

