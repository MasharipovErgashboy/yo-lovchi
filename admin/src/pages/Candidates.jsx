import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Eye, Check, X, Phone, User, Loader2 } from 'lucide-react';
import './PagesCommon.css';

const BACKEND_URL = "";

export default function Candidates() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 4000);
  };

  const fetchCandidates = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/candidates?status=pending`);
      if (res.ok) {
        const data = await res.json();
        setCandidates(data);
      }
    } catch (err) {
      console.error("Nomzodlarni yuklashda xatolik:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
    // 4 soniyada bir avtomatik yangilash (Polling)
    const interval = setInterval(fetchCandidates, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleApprove = async (candidateId) => {
    setActionLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/candidates/${candidateId}/approve`, {
        method: 'POST'
      });
      if (res.ok) {
        setCandidates(prev => prev.filter(c => c.id !== candidateId));
        setSelectedCandidate(null);
        showToast("✅ Nomzod tasdiqlandi! Haydovchiga bot orqali ilova yuborildi.");
      } else {
        showToast("❌ Tasdiqlashda xatolik yuz berdi");
      }
    } catch (err) {
      console.error("Tasdiqlashda xatolik:", err);
      showToast("❌ Serverga ulanishda xatolik");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (candidateId) => {
    setActionLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/candidates/${candidateId}/reject`, {
        method: 'POST'
      });
      if (res.ok) {
        setCandidates(prev => prev.filter(c => c.id !== candidateId));
        setSelectedCandidate(null);
        showToast("⚠️ Nomzod arizasi rad etildi");
      } else {
        showToast("❌ Rad etishda xatolik yuz berdi");
      }
    } catch (err) {
      console.error("Rad etishda xatolik:", err);
      showToast("❌ Serverga ulanishda xatolik");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="page-container">
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 9999,
          background: 'rgba(15, 23, 42, 0.95)',
          color: '#fff',
          padding: '12px 20px',
          borderRadius: '12px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 0 15px rgba(59, 130, 246, 0.3)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          fontSize: '14px',
          fontWeight: '500',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          animation: 'slideIn 0.3s ease-out'
        }}>
          {toast}
        </div>
      )}

      <div className="glass-card full-height">
        <div className="card-header">
          <h2>Haydovchi nomzodlari</h2>
          <span className="badge-count">
            {candidates.length} ta yangi ariza
          </span>
        </div>

        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>F.I.O</th>
                <th>Telefon raqam</th>
                <th>Status</th>
                <th>Sana</th>
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
              ) : candidates.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                    <User size={36} style={{ margin: '0 auto 12px', opacity: 0.3, display: 'block' }} />
                    Hozircha yangi arizalar kelib tushmagan.
                  </td>
                </tr>
              ) : (
                candidates.map(cand => (
                  <tr key={cand.id}>
                    <td>
                      <div className="td-user">
                        <div className="td-avatar"><User size={16} /></div>
                        {cand.name} {cand.surname}
                      </div>
                    </td>
                    <td>{cand.phone}</td>
                    <td>
                      <span className="status-badge new">
                        {cand.status === 'pending' ? 'Yangi' : cand.status}
                      </span>
                    </td>
                    <td>{cand.created_at || 'Hozirgina'}</td>
                    <td>
                      <button 
                        className="action-btn view"
                        onClick={() => setSelectedCandidate(cand)}
                        title="Ko'rish"
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Nomzod ma'lumotlari Modali */}
      {selectedCandidate && typeof document !== 'undefined' && createPortal(
        <div className="modal-overlay" onClick={() => !actionLoading && setSelectedCandidate(null)}>
          <div className="modal-content glass-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Nomzod ma'lumotlari</h3>
              <button 
                className="close-btn" 
                onClick={() => !actionLoading && setSelectedCandidate(null)}
                disabled={actionLoading}
              >
                <X size={24} />
              </button>
            </div>
            <div className="modal-body">
              <div className="cand-profile">
                <div className="cand-avatar large"><User size={40} /></div>
                <h2>{selectedCandidate.name} {selectedCandidate.surname}</h2>
                <div className="cand-phone">
                  <Phone size={16} /> {selectedCandidate.phone}
                </div>
                <div style={{ marginTop: '12px', fontSize: '13px', color: 'var(--text-muted)' }}>
                  Arizaning yuborilgan vaqti: {selectedCandidate.created_at}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn-reject" 
                onClick={() => handleReject(selectedCandidate.id)}
                disabled={actionLoading}
              >
                <X size={20} /> Rad etish
              </button>
              <button 
                className="btn-approve" 
                onClick={() => handleApprove(selectedCandidate.id)}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="animate-spin" size={18} /> Tasdiqlanmoqda...
                  </>
                ) : (
                  <>
                    <Check size={20} /> Tasdiqlash
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
