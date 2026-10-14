import React, { useState, useEffect } from 'react';
import { Plus, Edit2, X, MapPin, Trash2, Check, ExternalLink, Loader2, RefreshCw, Navigation } from 'lucide-react';
import './PagesCommon.css';
import './Routes.css';

const BACKEND_URL = "";

const COLOR_PRESETS = [
  { label: 'Moviy', value: '#3b82f6' },
  { label: 'Yashil', value: '#10b981' },
  { label: 'Binafsha', value: '#8b5cf6' },
  { label: 'Zarg\'aldoq', value: '#f59e0b' },
  { label: 'Qizil', value: '#ef4444' },
  { label: 'Pushti', value: '#ec4899' },
];

export default function RoutesPage() {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingRouteId, setEditingRouteId] = useState(null);
  
  // Form fields
  const [newRouteNum, setNewRouteNum] = useState('');
  const [newRouteName, setNewRouteName] = useState('');
  const [newRouteDirection, setNewRouteDirection] = useState('');
  const [newRouteColor, setNewRouteColor] = useState('#3b82f6');
  const [newStops, setNewStops] = useState([
    { name: '', raw: '' },
    { name: '', raw: '' }
  ]);

  const fetchRoutes = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/routes`);
      if (res.ok) {
        const data = await res.json();
        setRoutes(data || []);
      }
    } catch (e) {
      console.error("Marshrutlarni yuklashda xatolik:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutes();
  }, []);

  const openAddModal = () => {
    setEditingRouteId(null);
    setNewRouteNum('');
    setNewRouteName('');
    setNewRouteDirection('');
    setNewRouteColor('#3b82f6');
    setNewStops([
      { name: '1-bekat (Bosh bekat)', raw: '' },
      { name: 'Oxirgi bekat', raw: '' }
    ]);
    setIsAddModalOpen(true);
  };

  const openEditModal = (route) => {
    setEditingRouteId(route.id);
    setNewRouteNum(route.number || '');
    setNewRouteName(route.name || '');
    setNewRouteDirection(route.direction || '');
    setNewRouteColor(route.color || '#3b82f6');
    
    // Normalize stops
    let formattedStops = [];
    if (Array.isArray(route.stops) && route.stops.length > 0) {
      formattedStops = route.stops.map((s, idx) => {
        if (typeof s === 'string') {
          return { name: `Bekat ${idx + 1}`, raw: s };
        }
        return { name: s.name || `Bekat ${idx + 1}`, raw: s.raw || (s.lat && s.lng ? `${s.lat}, ${s.lng}` : '') };
      });
    } else {
      formattedStops = [
        { name: 'Bosh bekat', raw: '' },
        { name: 'Oxirgi bekat', raw: '' }
      ];
    }
    setNewStops(formattedStops);
    setIsAddModalOpen(true);
  };

  const closeAddModal = () => {
    setIsAddModalOpen(false);
    setEditingRouteId(null);
  };

  const handleDeleteRoute = async (id) => {
    if (!window.confirm("Haqiqatan ham bu marshrutni o'chirmoqchimisiz?")) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/routes/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setRoutes(routes.filter(r => r.id !== id));
      } else {
        alert("Marshrutni o'chirishda xatolik yuz berdi!");
      }
    } catch (err) {
      console.error("Delete route error:", err);
      alert("Server bilan bog'lanishda xatolik yuz berdi!");
    }
  };

  const handleAddStop = () => {
    setNewStops([...newStops, { name: `Bekat ${newStops.length + 1}`, raw: '' }]);
  };

  const handleStopFieldChange = (index, field, value) => {
    const updated = [...newStops];
    updated[index][field] = value;
    setNewStops(updated);
  };

  const handleRemoveStop = (index) => {
    if (newStops.length > 2) {
      const updated = newStops.filter((_, i) => i !== index);
      setNewStops(updated);
    }
  };

  const handleSaveRoute = async (e) => {
    e.preventDefault();
    if (newStops.some(s => !s.raw || s.raw.trim() === '')) {
      alert("Iltimos, har bir bekat uchun kordinata yoki havola kiriting!");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        number: String(newRouteNum).trim(),
        name: String(newRouteName || `${newRouteNum}-marshrut`).trim(),
        direction: String(newRouteDirection).trim(),
        color: newRouteColor,
        stops: newStops.map((s, idx) => ({
          name: s.name && s.name.trim() !== '' ? s.name.trim() : `Bekat ${idx + 1}`,
          raw: s.raw.trim()
        })),
        is_active: true
      };

      const url = editingRouteId ? `${BACKEND_URL}/api/routes/${editingRouteId}` : `${BACKEND_URL}/api/routes`;
      const method = editingRouteId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        await fetchRoutes();
        closeAddModal();
      } else {
        const errData = await res.json().catch(() => ({}));
        alert("Xatolik: " + (errData.detail || "Marshrutni saqlashda xatolik yuz berdi"));
      }
    } catch (err) {
      console.error("Save route error:", err);
      alert("Server bilan bog'lanishda xatolik!");
    } finally {
      setIsSaving(false);
    }
  };

  const isLink = (text) => text && (text.startsWith('http://') || text.startsWith('https://'));

  return (
    <div className="page-container">
      <div className="routes-header-actions">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 600 }}>Barcha Marshrutlar</h2>
          <button 
            onClick={fetchRoutes} 
            className="action-btn"
            style={{ width: '32px', height: '32px', padding: 0 }}
            title="Yangilash"
          >
            <RefreshCw size={14} />
          </button>
        </div>
        <button className="btn-primary" onClick={openAddModal}>
          <Plus size={20} /> Yangi marshrut qo'shish
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          <Loader2 className="animate-spin" size={28} style={{ margin: '0 auto 12px' }} />
          Marshrutlar yuklanmoqda...
        </div>
      ) : routes.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
          <Navigation size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
          <h3>Hozircha marshrutlar mavjud emas</h3>
          <p style={{ marginTop: '8px', fontSize: '14px' }}>Yuqoridagi tugma orqali yangi marshrut va bekatlarni qo'shing.</p>
        </div>
      ) : (
        <div className="routes-grid">
          {routes.map(route => {
            const stopsArray = Array.isArray(route.stops) ? route.stops : [];
            const badgeColor = route.color && route.color.startsWith('#') ? route.color : '#3b82f6';

            return (
              <div key={route.id} className="glass-card route-card" style={{ borderColor: `${badgeColor}33` }}>
                <div className="route-header">
                  <div className="route-badge" style={{ background: `linear-gradient(135deg, ${badgeColor}, #1e293b)`, border: `1px solid ${badgeColor}` }}>
                    {route.number}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>{route.name}</h3>
                    {route.direction && (
                      <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {route.direction}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      className="icon-btn-small" 
                      title="Tahrirlash"
                      onClick={() => openEditModal(route)}
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      className="icon-btn-small" 
                      title="O'chirish"
                      style={{ color: '#ef4444' }}
                      onClick={() => handleDeleteRoute(route.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                
                <div className="route-stops">
                  <h4 style={{ color: 'var(--text-muted)', marginBottom: '12px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Bekatlar ({stopsArray.length}):
                  </h4>
                  <ul className="stops-list">
                    {stopsArray.map((stop, idx) => {
                      const stopName = typeof stop === 'object' ? stop.name : `Bekat ${idx + 1}`;
                      const stopRaw = typeof stop === 'object' ? (stop.raw || (stop.lat && stop.lng ? `${stop.lat}, ${stop.lng}` : '')) : String(stop);
                      const stopLat = typeof stop === 'object' ? stop.lat : null;
                      const stopLng = typeof stop === 'object' ? stop.lng : null;

                      return (
                        <li key={idx} style={{ wordBreak: 'break-all', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '3px' }}>
                          <div className="stop-marker" style={{ borderColor: badgeColor, background: idx === 0 ? badgeColor : idx === stopsArray.length - 1 ? '#10b981' : 'var(--bg-dark)' }}></div>
                          <span style={{ fontWeight: 500, fontSize: '14px', color: 'var(--text-main)' }}>
                            {idx + 1}. {stopName}
                          </span>
                          {isLink(stopRaw) ? (
                            <a href={stopRaw} target="_blank" rel="noopener noreferrer" style={{ color: badgeColor, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                              Xarita havolasi <ExternalLink size={12} />
                            </a>
                          ) : (
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                              📍 {stopLat && stopLng ? `${stopLat.toFixed(4)}, ${stopLng.toFixed(4)}` : stopRaw}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Route Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay" onClick={closeAddModal}>
          <div className="modal-content glass-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h3>{editingRouteId ? 'Marshrutni tahrirlash' : 'Yangi marshrut yaratish'}</h3>
              <button className="close-btn" onClick={closeAddModal}><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSaveRoute}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div style={{ display: 'flex', gap: '14px' }}>
                  <div style={{ width: '130px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '13px' }}>Marshrut No</label>
                    <input 
                      type="text" 
                      className="custom-input" 
                      placeholder="Masalan: 12" 
                      value={newRouteNum}
                      onChange={(e) => {
                        setNewRouteNum(e.target.value);
                        if (!editingRouteId && (!newRouteName || newRouteName.endsWith('-marshrut'))) {
                          setNewRouteName(`${e.target.value}-marshrut`);
                        }
                      }}
                      required
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '13px' }}>Marshrut nomi</label>
                    <input 
                      type="text" 
                      className="custom-input" 
                      placeholder="12-marshrut" 
                      value={newRouteName}
                      onChange={(e) => setNewRouteName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '13px' }}>Yo'nalish tavsifi</label>
                  <input 
                    type="text" 
                    className="custom-input" 
                    placeholder="Andijon (Eski shahar) → Asaka" 
                    value={newRouteDirection}
                    onChange={(e) => setNewRouteDirection(e.target.value)}
                  />
                </div>

                {/* Color picker */}
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '13px' }}>Xaritadagi chiziq rangi</label>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    {COLOR_PRESETS.map(c => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setNewRouteColor(c.value)}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: c.value,
                          border: newRouteColor === c.value ? '3px solid #ffffff' : '2px solid transparent',
                          boxShadow: newRouteColor === c.value ? '0 0 10px rgba(255,255,255,0.4)' : 'none',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        title={c.label}
                      />
                    ))}
                    <input 
                      type="color" 
                      value={newRouteColor}
                      onChange={(e) => setNewRouteColor(e.target.value)}
                      style={{ width: '32px', height: '32px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                      title="Boshqa rang tanlash"
                    />
                  </div>
                </div>

                {/* Stops Section */}
                <div className="stops-section" style={{ background: 'rgba(255,255,255,0.03)', padding: '18px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <h4 style={{ marginBottom: '14px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MapPin size={16} color={newRouteColor} /> Bekatlar ro'yxati va Kordinatalari
                  </h4>
                  <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '14px' }}>
                    Bekat kordinatasini (masalan: <code>40.7821, 72.3442</code>) yoki Google/Yandex Xarita havolasini kiriting.
                  </p>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {newStops.map((stop, idx) => (
                      <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: 'rgba(15, 23, 42, 0.4)', padding: '10px 12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ 
                            width: '24px', height: '24px', borderRadius: '50%', background: newRouteColor, 
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold', flexShrink: 0, color: 'white'
                          }}>
                            {idx + 1}
                          </div>
                          <input 
                            type="text" 
                            className="custom-input" 
                            style={{ flex: 1, padding: '8px 12px', fontSize: '13px' }}
                            placeholder={`Bekat nomi (masalan: ${idx === 0 ? 'Bosh bekat' : idx === newStops.length - 1 ? 'Oxirgi bekat' : 'Bekat ' + (idx + 1)})`}
                            value={stop.name}
                            onChange={(e) => handleStopFieldChange(idx, 'name', e.target.value)}
                          />
                          {newStops.length > 2 && (
                            <button 
                              type="button" 
                              className="icon-btn-small" 
                              style={{ color: '#ef4444', borderColor: 'transparent', flexShrink: 0 }}
                              onClick={() => handleRemoveStop(idx)}
                              title="O'chirish"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                        <input 
                          type="text" 
                          className="custom-input" 
                          style={{ padding: '8px 12px', fontSize: '13px' }}
                          placeholder="40.7821, 72.3442 yoki Google/Yandex maps havolasi" 
                          value={stop.raw}
                          onChange={(e) => handleStopFieldChange(idx, 'raw', e.target.value)}
                          required
                        />
                      </div>
                    ))}
                  </div>

                  <button 
                    type="button" 
                    className="action-btn" 
                    style={{ marginTop: '14px', width: '100%', justifyContent: 'center' }}
                    onClick={handleAddStop}
                  >
                    <Plus size={16} /> Yana bekat qo'shish
                  </button>
                </div>
              </div>
              
              <div className="modal-footer" style={{ marginTop: '18px' }}>
                <button type="button" className="btn-reject" onClick={closeAddModal} disabled={isSaving}>
                  Bekor qilish
                </button>
                <button type="submit" className="btn-approve" disabled={isSaving}>
                  {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />} Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .custom-input {
          width: 100%;
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          padding: 10px 14px;
          color: var(--text-main);
          font-size: 14px;
          outline: none;
          transition: all 0.2s;
        }
        .custom-input:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
        }
      `}</style>
    </div>
  );
}
