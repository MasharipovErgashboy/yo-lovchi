import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Edit2, X, MapPin, Trash2, Check, ExternalLink, Loader2, Navigation, Music, Volume2 } from 'lucide-react';
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
  const [uploadingStopIdx, setUploadingStopIdx] = useState(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingRouteId, setEditingRouteId] = useState(null);
  
  // Form fields
  const [newRouteNum, setNewRouteNum] = useState('');
  const [newRouteName, setNewRouteName] = useState('');
  const [newRouteDirection, setNewRouteDirection] = useState('');
  const [newRouteColor, setNewRouteColor] = useState('#3b82f6');
  const [arrowColorForward, setArrowColorForward] = useState('#0066FF');
  const [arrowColorBackward, setArrowColorBackward] = useState('#10B981');
  const [newStops, setNewStops] = useState([
    { name: '', raw: '', audio_url: null, audio_name: '' },
    { name: '', raw: '', audio_url: null, audio_name: '' }
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
    if (routes.length >= 1) {
      alert("Tizimda faqat bitta marshrut yaratish mumkin!");
      return;
    }
    setEditingRouteId(null);
    setNewRouteNum('');
    setNewRouteName('');
    setNewRouteDirection('');
    setNewRouteColor('#3b82f6');
    setArrowColorForward('#0066FF');
    setArrowColorBackward('#10B981');
    setNewStops([
      { name: '1-bekat (Bosh bekat)', raw: '', audio_url: null, audio_name: '' },
      { name: 'Oxirgi bekat', raw: '', audio_url: null, audio_name: '' }
    ]);
    setIsAddModalOpen(true);
  };

  const openEditModal = (route) => {
    setEditingRouteId(route.id);
    setNewRouteNum(route.number || '');
    setNewRouteName(route.name || '');
    setNewRouteDirection(route.direction || '');
    setNewRouteColor(route.color || '#3b82f6');
    setArrowColorForward(route.arrow_color_forward || '#0066FF');
    setArrowColorBackward(route.arrow_color_backward || '#10B981');
    
    // Normalize stops
    let formattedStops = [];
    if (Array.isArray(route.stops) && route.stops.length > 0) {
      formattedStops = route.stops.map((s, idx) => {
        if (typeof s === 'string') {
          return { name: `Bekat ${idx + 1}`, raw: s, audio_url: null, audio_name: '' };
        }
        return { 
          name: s.name || `Bekat ${idx + 1}`, 
          raw: s.raw || (s.lat && s.lng ? `${s.lat}, ${s.lng}` : ''),
          audio_url: s.audio_url || null,
          audio_name: s.audio_name || (s.audio_url ? s.audio_url.split('/').pop() : '')
        };
      });
    } else {
      formattedStops = [
        { name: 'Bosh bekat', raw: '', audio_url: null, audio_name: '' },
        { name: 'Oxirgi bekat', raw: '', audio_url: null, audio_name: '' }
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
    setNewStops([...newStops, { name: `Bekat ${newStops.length + 1}`, raw: '', audio_url: null, audio_name: '' }]);
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

  const handleAudioFileUpload = async (index, file) => {
    if (!file) return;
    setUploadingStopIdx(index);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${BACKEND_URL}/api/upload/audio`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.url) {
        const updated = [...newStops];
        updated[index].audio_url = data.url;
        updated[index].audio_name = file.name;
        setNewStops(updated);
      } else {
        alert(data.detail || "Audio faylni yuklashda xatolik yuz berdi!");
      }
    } catch (err) {
      console.error("Audio upload error:", err);
      alert("Server bilan bog'lanishda xatolik yuz berdi!");
    } finally {
      setUploadingStopIdx(null);
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
        arrow_color_forward: arrowColorForward,
        arrow_color_backward: arrowColorBackward,
        stops: newStops.map((s, idx) => ({
          name: s.name && s.name.trim() !== '' ? s.name.trim() : `Bekat ${idx + 1}`,
          raw: s.raw.trim(),
          audio_url: s.audio_url || null,
          audio_name: s.audio_name || ''
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
        <h2 style={{ fontSize: '24px', fontWeight: 600 }}>Barcha Marshrutlar</h2>
        <button 
          className="btn-primary" 
          onClick={routes.length >= 1 ? undefined : openAddModal}
          disabled={routes.length >= 1}
          style={routes.length >= 1 ? {
            background: '#475569',
            borderColor: '#334155',
            color: '#94a3b8',
            cursor: 'not-allowed',
            opacity: 0.65,
            boxShadow: 'none'
          } : {}}
          title={routes.length >= 1 ? "Faqat 1 ta marshrut yaratish mumkin" : "Yangi marshrut qo'shish"}
        >
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
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                      <span style={{ 
                        display: 'inline-flex', alignItems: 'center', gap: '5px', 
                        background: 'rgba(255,255,255,0.04)', padding: '2px 8px', borderRadius: '6px',
                        fontSize: '11px', border: '1px solid rgba(255,255,255,0.08)'
                      }}>
                        <svg width="12" height="12" viewBox="0 0 32 32">
                          <path d="M16 2 L28 27 L16 21 L4 27 Z" fill={route.arrow_color_forward || '#0066FF'} stroke="#ffffff" strokeWidth="2" strokeLinejoin="round"/>
                        </svg>
                        Ketmoqda: <strong style={{ color: route.arrow_color_forward || '#0066FF' }}>{route.arrow_color_forward || '#0066FF'}</strong>
                      </span>
                      <span style={{ 
                        display: 'inline-flex', alignItems: 'center', gap: '5px', 
                        background: 'rgba(255,255,255,0.04)', padding: '2px 8px', borderRadius: '6px',
                        fontSize: '11px', border: '1px solid rgba(255,255,255,0.08)'
                      }}>
                        <svg width="12" height="12" viewBox="0 0 32 32" style={{ transform: 'rotate(180deg)' }}>
                          <path d="M16 2 L28 27 L16 21 L4 27 Z" fill={route.arrow_color_backward || '#10B981'} stroke="#ffffff" strokeWidth="2" strokeLinejoin="round"/>
                        </svg>
                        Kelmoqda: <strong style={{ color: route.arrow_color_backward || '#10B981' }}>{route.arrow_color_backward || '#10B981'}</strong>
                      </span>
                    </div>
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
                          {typeof stop === 'object' && stop.audio_url && (
                            <span style={{ fontSize: '12px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                              <Volume2 size={13} /> Ovozli e'lon (.mp3)
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
      {isAddModalOpen && typeof document !== 'undefined' && createPortal(
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

                {/* Arrow Colors for Drivers on Passenger Map */}
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '16px', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <label style={{ display: 'block', marginBottom: '4px', color: 'var(--text-main)', fontSize: '13px', fontWeight: 600 }}>
                    Xaritadagi haydovchilar strelkalari ranglari
                  </label>
                  <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '14px' }}>
                    Yo'lovchi ilovasida haydovchilar strelka shaklida ko'rinadi. Qaysi yo'nalishda qanday rangda chiqishini belgilang.
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                    {/* Ketmoqda */}
                    <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <svg width="18" height="18" viewBox="0 0 32 32">
                            <path d="M16 2 L28 27 L16 21 L4 27 Z" fill={arrowColorForward} stroke="#ffffff" strokeWidth="2" strokeLinejoin="round"/>
                          </svg>
                          "Ketmoqda" strelkasi
                        </span>
                        <span style={{ fontSize: '12px', fontFamily: 'monospace', color: arrowColorForward, fontWeight: 'bold' }}>
                          {arrowColorForward}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '7px', alignItems: 'center' }}>
                        {['#0066FF', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'].map(col => (
                          <button
                            key={col}
                            type="button"
                            onClick={() => setArrowColorForward(col)}
                            style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '50%',
                              background: col,
                              border: arrowColorForward === col ? '2px solid #ffffff' : '1px solid transparent',
                              boxShadow: arrowColorForward === col ? '0 0 8px rgba(255,255,255,0.4)' : 'none',
                              cursor: 'pointer',
                              padding: 0
                            }}
                          />
                        ))}
                        <input 
                          type="color" 
                          value={arrowColorForward} 
                          onChange={(e) => setArrowColorForward(e.target.value)} 
                          style={{ width: '28px', height: '28px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                          title="Boshqa rang"
                        />
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                        Bosh bekatdan oxirgi bekatga ketayotganda
                      </div>
                    </div>

                    {/* Kelmoqda */}
                    <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <svg width="18" height="18" viewBox="0 0 32 32" style={{ transform: 'rotate(180deg)' }}>
                            <path d="M16 2 L28 27 L16 21 L4 27 Z" fill={arrowColorBackward} stroke="#ffffff" strokeWidth="2" strokeLinejoin="round"/>
                          </svg>
                          "Kelmoqda" strelkasi
                        </span>
                        <span style={{ fontSize: '12px', fontFamily: 'monospace', color: arrowColorBackward, fontWeight: 'bold' }}>
                          {arrowColorBackward}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '7px', alignItems: 'center' }}>
                        {['#10B981', '#0066FF', '#06B6D4', '#F59E0B', '#EF4444', '#EC4899'].map(col => (
                          <button
                            key={col}
                            type="button"
                            onClick={() => setArrowColorBackward(col)}
                            style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '50%',
                              background: col,
                              border: arrowColorBackward === col ? '2px solid #ffffff' : '1px solid transparent',
                              boxShadow: arrowColorBackward === col ? '0 0 8px rgba(255,255,255,0.4)' : 'none',
                              cursor: 'pointer',
                              padding: 0
                            }}
                          />
                        ))}
                        <input 
                          type="color" 
                          value={arrowColorBackward} 
                          onChange={(e) => setArrowColorBackward(e.target.value)} 
                          style={{ width: '28px', height: '28px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                          title="Boshqa rang"
                        />
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                        Oxirgi bekatdan bosh bekatga qaytayotganda
                      </div>
                    </div>
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
                      <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(15, 23, 42, 0.4)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
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

                        {/* MP3 Audio Upload / Player */}
                        <div style={{ marginTop: '2px' }}>
                          {stop.audio_url ? (
                            <div style={{ 
                              display: 'flex', alignItems: 'center', gap: '8px', 
                              background: 'rgba(16, 185, 129, 0.1)', padding: '6px 10px', 
                              borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.25)' 
                            }}>
                              <Volume2 size={16} color="#10b981" style={{ flexShrink: 0 }} />
                              <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {stop.audio_name || 'MP3 audio biriktirilgan'}
                              </span>
                              <audio 
                                src={stop.audio_url.startsWith('http') ? stop.audio_url : `${BACKEND_URL}${stop.audio_url}`} 
                                controls 
                                style={{ height: '28px', maxWidth: '170px' }} 
                              />
                              <button 
                                type="button" 
                                style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                                onClick={() => {
                                  handleStopFieldChange(idx, 'audio_url', null);
                                  handleStopFieldChange(idx, 'audio_name', '');
                                }}
                                title="Audioni o'chirish"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ) : (
                            <label style={{ 
                              display: 'inline-flex', alignItems: 'center', gap: '6px', 
                              fontSize: '12px', color: '#94a3b8', cursor: 'pointer', 
                              padding: '7px 10px', borderRadius: '8px', 
                              background: 'rgba(255, 255, 255, 0.03)', border: '1px dashed rgba(255, 255, 255, 0.15)',
                              transition: 'all 0.2s', width: '100%', boxSizing: 'border-box', justifyContent: 'center'
                            }}>
                              {uploadingStopIdx === idx ? (
                                <>
                                  <Loader2 size={14} className="animate-spin" color="#3b82f6" />
                                  <span style={{ color: '#3b82f6', fontWeight: 500 }}>Audio yuklanmoqda...</span>
                                </>
                              ) : (
                                <>
                                  <Music size={14} color="#3b82f6" />
                                  <span>Bekat uchun MP3 audio yuklash (ixtiyoriy)</span>
                                </>
                              )}
                              <input 
                                type="file" 
                                accept="audio/*,.mp3,.wav,.m4a" 
                                style={{ display: 'none' }} 
                                disabled={uploadingStopIdx === idx}
                                onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    handleAudioFileUpload(idx, e.target.files[0]);
                                    e.target.value = '';
                                  }
                                }}
                              />
                            </label>
                          )}
                        </div>
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
        </div>,
        document.body
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
