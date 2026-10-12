import { useState, useEffect, useMemo } from 'react'
import { MessageCircle, Bell, AlertTriangle, User, Bus, CheckCircle2, Info, ChevronRight, X, Loader2 } from 'lucide-react'

export default function Messages() {
  const [activeMsgTab, setActiveMsgTab] = useState('barchasi');
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  const { phone, tgUserId } = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const p = params.get('phone');
    const tgId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
    return { phone: p, tgUserId: tgId };
  }, []);

  const fetchMessages = async () => {
    try {
      const q = new URLSearchParams();
      if (phone) q.set('phone', phone);
      if (tgUserId) q.set('telegram_id', tgUserId);

      const res = await fetch(`/api/driver-messages?${q.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data || []);
      }
    } catch (err) {
      console.error("Xabarlarni yuklashda xatolik:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    // 4 soniyada bir yangilab turish (Real-time polling)
    const interval = setInterval(fetchMessages, 4000);
    return () => clearInterval(interval);
  }, [phone, tgUserId]);

  const handleOpenMessage = async (msg) => {
    setSelectedMessage(msg);
    if (!msg.is_read) {
      // Mahalliy holatda o'qilgan deb belgilash
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_read: true } : m));
      try {
        const q = new URLSearchParams();
        if (phone) q.set('phone', phone);
        if (tgUserId) q.set('telegram_id', tgUserId);
        await fetch(`/api/messages/${msg.id}/read?${q.toString()}`, { method: 'POST' });
      } catch (err) {
        console.error("Xabarni o'qilgan qilishda xatolik:", err);
      }
    }
  };

  const getTypeMeta = (type) => {
    switch (type) {
      case 'alert':
      case 'warning':
        return {
          icon: <AlertTriangle size={22} color="white" />,
          modalIcon: <AlertTriangle size={32} color="white" />,
          color: '#ef4444',
          modalColor: '#ef4444',
          bgLight: '#fee2e2'
        };
      case 'info':
        return {
          icon: <Info size={22} color="white" />,
          modalIcon: <Info size={32} color="white" />,
          color: '#0284c7',
          modalColor: '#0284c7',
          bgLight: '#e0f2fe'
        };
      case 'system':
      default:
        return {
          icon: <Bus size={22} color="white" />,
          modalIcon: <Bus size={32} color="white" />,
          color: '#2563eb',
          modalColor: '#2563eb',
          bgLight: '#dbeafe'
        };
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    try {
      if (dateStr.includes(' ')) {
        const parts = dateStr.split(' ');
        return parts[1] || dateStr;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const filteredMessages = messages.filter(msg => {
    if (activeMsgTab === 'tizim') {
      return msg.type === 'system' || msg.target_type === 'all';
    }
    return true;
  });

  const unreadTotal = messages.filter(m => !m.is_read).length;
  const unreadSystem = messages.filter(m => (m.type === 'system' || m.target_type === 'all') && !m.is_read).length;

  return (
    <>
      <div className="messages-container">
        <div className="messages-sticky-header">
          <div className="header-container" style={{ marginBottom: 0 }}>
            <h1 className="header-title">Xabarlar</h1>
            <div className="header-subtitle">Tizim va administratsiyadan bildirishnomalar</div>
          </div>

          <div className="tabs-container">
            <button 
              className={`tab-btn ${activeMsgTab === 'barchasi' ? 'active' : ''}`}
              onClick={() => setActiveMsgTab('barchasi')}
            >
              <MessageCircle size={18} fill="currentColor" /> Barchasi
              {unreadTotal > 0 && (
                <span style={{
                  background: activeMsgTab === 'barchasi' ? '#ffffff' : '#ef4444',
                  color: activeMsgTab === 'barchasi' ? '#2563eb' : '#ffffff',
                  fontSize: '11px',
                  fontWeight: '700',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  marginLeft: '4px'
                }}>
                  {unreadTotal}
                </span>
              )}
            </button>
            <button 
              className={`tab-btn ${activeMsgTab === 'tizim' ? 'active' : ''}`}
              onClick={() => setActiveMsgTab('tizim')}
            >
              <Bell size={18} fill="currentColor" /> Tizim
              {unreadSystem > 0 && (
                <span style={{
                  background: activeMsgTab === 'tizim' ? '#ffffff' : '#ef4444',
                  color: activeMsgTab === 'tizim' ? '#2563eb' : '#ffffff',
                  fontSize: '11px',
                  fontWeight: '700',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  marginLeft: '4px'
                }}>
                  {unreadSystem}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="messages-list-wrapper">
          <div className="messages-list">
            {loading ? (
              <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <Loader2 className="animate-spin" size={24} color="#2563eb" />
                <span style={{ fontSize: '14px' }}>Xabarlar yuklanmoqda...</span>
              </div>
            ) : filteredMessages.length > 0 ? (
              filteredMessages.map((msg) => {
                const meta = getTypeMeta(msg.type);
                return (
                  <div 
                    className="message-item" 
                    key={msg.id} 
                    onClick={() => handleOpenMessage(msg)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="message-icon-wrapper" style={{ backgroundColor: meta.color }}>
                      {meta.icon}
                    </div>
                    
                    <div className="message-content">
                      <div className="message-header">
                        <span className="message-title" style={{ fontWeight: !msg.is_read ? '700' : '600' }}>
                          {msg.title}
                        </span>
                        <span className="message-time">{formatTime(msg.created_at)}</span>
                      </div>
                      <div className="message-body">
                        <span className="message-desc" style={{ color: !msg.is_read ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                          {msg.message}
                        </span>
                        <div className="message-right">
                          {!msg.is_read && <div className="unread-dot"></div>}
                          <ChevronRight size={16} color="var(--text-secondary)" className="chevron" />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ padding: '48px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'rgba(37, 99, 235, 0.08)',
                  color: 'var(--blue-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px'
                }}>
                  <MessageCircle size={28} />
                </div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Hozircha xabarlar yo'q
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '260px', lineHeight: '1.4' }}>
                  Administrator tomonidan yuborilgan barcha xabarlar va bildirishnomalar shu yerda ko'rinadi
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedMessage && (() => {
        const modalMeta = getTypeMeta(selectedMessage.type);
        return (
          <div className="modal-overlay" onClick={() => setSelectedMessage(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close-btn" onClick={() => setSelectedMessage(null)}>
                <X size={18} />
              </button>
              
              <div className="modal-pulse-wrapper">
                <div className="modal-pulse-1" style={{ backgroundColor: modalMeta.modalColor }}></div>
                <div className="modal-pulse-2" style={{ backgroundColor: modalMeta.modalColor }}></div>
                <div className="modal-pulse-3" style={{ backgroundColor: modalMeta.modalColor }}>
                  {modalMeta.modalIcon}
                </div>
              </div>

              <h3 className="modal-title">{selectedMessage.title}</h3>
              <div className="modal-time">{selectedMessage.created_at || ''}</div>

              <div className="modal-desc-box" style={{ backgroundColor: modalMeta.bgLight, whiteSpace: 'pre-wrap' }}>
                {selectedMessage.message}
              </div>

              <button className="btn-primary" onClick={() => setSelectedMessage(null)}>
                Tushunarli
              </button>
            </div>
          </div>
        );
      })()}
    </>
  );
}

