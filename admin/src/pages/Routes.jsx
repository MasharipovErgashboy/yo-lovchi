import React, { useState } from 'react';
import { Plus, Edit2, X, MapPin, Trash2, Check, ExternalLink } from 'lucide-react';
import './PagesCommon.css';
import './Routes.css';

export default function RoutesPage() {
  const [routes, setRoutes] = useState([
    { 
      id: 1, 
      num: 12, 
      name: 'Toshkent → Chirchiq',
      stops: ['41.344652, 69.236548', 'https://yandex.uz/maps/org/146016328030', '41.364652, 69.256548', '41.374652, 69.266548'] 
    },
    { 
      id: 2, 
      num: 15, 
      name: 'Toshkent → G\'azalkent',
      stops: ['41.344652, 69.236548', '41.454652, 69.346548', 'https://yandex.uz/maps/org/123456789'] 
    }
  ]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingRouteId, setEditingRouteId] = useState(null);
  const [newRouteNum, setNewRouteNum] = useState('');
  const [newRouteName, setNewRouteName] = useState('');
  const [newStops, setNewStops] = useState(['', '']); // Minimum 2 stops

  const openAddModal = () => {
    setEditingRouteId(null);
    setNewRouteNum('');
    setNewRouteName('');
    setNewStops(['', '']);
    setIsAddModalOpen(true);
  };

  const openEditModal = (route) => {
    setEditingRouteId(route.id);
    setNewRouteNum(route.num);
    setNewRouteName(route.name);
    setNewStops([...route.stops]);
    setIsAddModalOpen(true);
  };

  const closeAddModal = () => {
    setIsAddModalOpen(false);
    setEditingRouteId(null);
    setNewRouteNum('');
    setNewRouteName('');
    setNewStops(['', '']);
  };

  const handleDeleteRoute = (id) => {
    if (window.confirm("Haqiqatan ham bu marshrutni o'chirmoqchimisiz?")) {
      setRoutes(routes.filter(r => r.id !== id));
    }
  };

  const handleAddStop = () => {
    setNewStops([...newStops, '']);
  };

  const handleStopChange = (index, value) => {
    const updatedStops = [...newStops];
    updatedStops[index] = value;
    setNewStops(updatedStops);
  };

  const handleRemoveStop = (index) => {
    if (newStops.length > 2) {
      const updatedStops = newStops.filter((_, i) => i !== index);
      setNewStops(updatedStops);
    }
  };

  const handleSaveRoute = (e) => {
    e.preventDefault();
    if (newStops.some(stop => stop.trim() === '')) {
      alert("Iltimos, barcha bekat kordinatalari yoki havolalarini kiriting!");
      return;
    }
    
    if (editingRouteId) {
      // Edit existing
      setRoutes(routes.map(r => r.id === editingRouteId ? {
        ...r,
        num: newRouteNum,
        name: newRouteName,
        stops: newStops.filter(s => s.trim() !== '')
      } : r));
    } else {
      // Add new
      const newRoute = {
        id: Date.now(),
        num: newRouteNum || routes.length + 1,
        name: newRouteName || 'Yangi marshrut',
        stops: newStops.filter(s => s.trim() !== '')
      };
      setRoutes([...routes, newRoute]);
    }
    closeAddModal();
  };

  const isLink = (text) => text.startsWith('http://') || text.startsWith('https://');

  return (
    <div className="page-container">
      <div className="routes-header-actions">
        <h2 style={{ fontSize: '24px', fontWeight: 600 }}>Barcha Marshrutlar</h2>
        <button className="btn-primary" onClick={openAddModal}>
          <Plus size={20} /> Yangi marshrut qo'shish
        </button>
      </div>

      <div className="routes-grid">
        {routes.map(route => (
          <div key={route.id} className="glass-card route-card">
            <div className="route-header">
              <div className="route-badge">{route.num}</div>
              <h3>{route.name}</h3>
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
              <h4 style={{ color: 'var(--text-muted)', marginBottom: '12px', fontSize: '13px', textTransform: 'uppercase' }}>Bekatlar ({route.stops.length}):</h4>
              <ul className="stops-list">
                {route.stops.map((stop, idx) => (
                  <li key={idx} style={{ wordBreak: 'break-all' }}>
                    <div className="stop-marker"></div>
                    {isLink(stop) ? (
                      <a href={stop} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        Yandex xarita havolasi <ExternalLink size={14} />
                      </a>
                    ) : (
                      <span>{stop}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Route Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay" onClick={closeAddModal}>
          <div className="modal-content glass-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h3>{editingRouteId ? 'Marshrutni tahrirlash' : 'Yangi marshrut yaratish'}</h3>
              <button className="close-btn" onClick={closeAddModal}><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSaveRoute}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '14px' }}>Marshrut raqami</label>
                    <input 
                      type="text" 
                      className="custom-input" 
                      placeholder="Masalan: 12" 
                      value={newRouteNum}
                      onChange={(e) => setNewRouteNum(e.target.value)}
                      required
                    />
                  </div>
                  <div style={{ flex: 2 }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '14px' }}>Marshrut yo'nalishi nomi</label>
                    <input 
                      type="text" 
                      className="custom-input" 
                      placeholder="Toshkent → Chirchiq" 
                      value={newRouteName}
                      onChange={(e) => setNewRouteName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="stops-section" style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '16px' }}>
                  <h4 style={{ marginBottom: '16px', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px', lineHeight: '1.4' }}>
                    <MapPin size={18} color="var(--primary)" style={{ flexShrink: 0 }} /> Kordinata yoki Yandex Xarita havolasi
                  </h4>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {newStops.map((stop, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ 
                          width: '28px', height: '28px', borderRadius: '50%', background: 'var(--primary)', 
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold', flexShrink: 0 
                        }}>
                          {idx + 1}
                        </div>
                        <input 
                          type="text" 
                          className="custom-input" 
                          style={{ flex: 1 }}
                          placeholder="41.3446, 69.2365 yoki https://yandex.uz/maps/..." 
                          value={stop}
                          onChange={(e) => handleStopChange(idx, e.target.value)}
                          required
                        />
                        {newStops.length > 2 && (
                          <button 
                            type="button" 
                            className="icon-btn-small" 
                            style={{ color: '#ef4444', borderColor: 'transparent', flexShrink: 0 }}
                            onClick={() => handleRemoveStop(idx)}
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <button 
                    type="button" 
                    className="action-btn" 
                    style={{ marginTop: '16px', width: '100%', justifyContent: 'center' }}
                    onClick={handleAddStop}
                  >
                    <Plus size={18} /> Yana bekat qo'shish
                  </button>
                </div>
              </div>
              
              <div className="modal-footer">
                <button type="button" className="btn-reject" onClick={closeAddModal}>
                  Bekor qilish
                </button>
                <button type="submit" className="btn-approve">
                  <Check size={20} /> Saqlash
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
          border-radius: 12px;
          padding: 14px 16px;
          color: var(--text-main);
          font-size: 15px;
          outline: none;
          transition: all 0.2s;
        }
        .custom-input:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
      `}</style>
    </div>
  )
}
