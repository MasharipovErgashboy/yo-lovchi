import React, { useState, useEffect } from 'react';
import { 
  Send, 
  User, 
  MessageCircle, 
  Phone, 
  Search, 
  Car, 
  Users, 
  Route, 
  Trash2, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Loader2,
  ExternalLink
} from 'lucide-react';
import './PagesCommon.css';
import './Support.css';

const BACKEND_URL = "";

export default function Support() {
  const [activeTab, setActiveTab] = useState('driver'); // 'driver' | 'passenger'
  const [inquiries, setInquiries] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchInquiries = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/support-inquiries`);
      if (res.ok) {
        const data = await res.json();
        setInquiries(data || []);
      }
    } catch (e) {
      console.error("Murojaatlarni yuklashda xatolik:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInquiries();
    const interval = setInterval(fetchInquiries, 5000);
    return () => clearInterval(interval);
  }, []);

  // Filter inquiries by active tab and search query
  const tabInquiries = inquiries.filter(item => item.sender_type === activeTab);
  
  const filteredInquiries = tabInquiries.filter(item => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const name = (item.sender_name || '').toLowerCase();
    const phone = (item.sender_phone || '').toLowerCase();
    const msg = (item.message || '').toLowerCase();
    const pName = `${item.profile_driver_name || ''} ${item.profile_driver_car_number || item.profile_driver_surname || ''}`.toLowerCase();
    const rNum = (item.route_number || '').toLowerCase();
    return name.includes(q) || phone.includes(q) || msg.includes(q) || pName.includes(q) || rNum.includes(q);
  });

  // Calculate counts for badges
  const driverNewCount = inquiries.filter(i => i.sender_type === 'driver' && i.status === 'new').length;
  const passengerNewCount = inquiries.filter(i => i.sender_type === 'passenger' && i.status === 'new').length;

  // Selected inquiry
  const selectedInquiry = inquiries.find(i => i.id === selectedId) || filteredInquiries[0] || null;

  // Set default selection when tab changes or when list arrives
  useEffect(() => {
    if (filteredInquiries.length > 0) {
      const exists = filteredInquiries.some(i => i.id === selectedId);
      if (!exists) {
        setSelectedId(filteredInquiries[0].id);
      }
    } else {
      setSelectedId(null);
    }
  }, [activeTab, inquiries.length]);

  const handleStatusChange = async (inquiryId, newStatus) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/support-inquiries/${inquiryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setInquiries(prev => prev.map(i => i.id === inquiryId ? { ...i, status: newStatus } : i));
      }
    } catch (e) {
      console.error("Statusni yangilashda xatolik:", e);
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedInquiry) return;

    setIsSendingReply(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/support-inquiries/${selectedInquiry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          admin_reply: replyText.trim(),
          status: 'resolved'
        })
      });

      if (res.ok) {
        const updated = await res.json();
        setInquiries(prev => prev.map(i => i.id === selectedInquiry.id ? updated : i));
        setReplyText('');
      } else {
        alert("Javob yuborishda xatolik yuz berdi");
      }
    } catch (e) {
      console.error("Reply error:", e);
      alert("Server bilan bog'lanishda xatolik");
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleDelete = async (inquiryId) => {
    if (!window.confirm("Haqiqatan ham bu murojaatni o'chirmoqchimisiz?")) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/support-inquiries/${inquiryId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setInquiries(prev => prev.filter(i => i.id !== inquiryId));
        if (selectedId === inquiryId) {
          setSelectedId(null);
        }
      } else {
        alert("O'chirishda xatolik");
      }
    } catch (e) {
      console.error("Delete inquiry error:", e);
      alert("Server bilan bog'lanishda xatolik");
    }
  };

  const formatAdminDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      let str = String(dateStr).trim();
      if (!str.endsWith('Z') && !str.includes('+')) {
        str = str.replace(' ', 'T') + 'Z';
      }
      const d = new Date(str);
      if (isNaN(d.getTime())) return dateStr;
      const h = String(d.getHours()).padStart(2, '0');
      const m = String(d.getMinutes()).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      return `${day}.${month} ${h}:${m}`;
    } catch {
      return dateStr;
    }
  };

  const renderStatusBadge = (status) => {
    if (status === 'resolved') {
      return <span className="status-pill resolved">✓ Hal qilindi</span>;
    }
    if (status === 'in_progress') {
      return <span className="status-pill in_progress">⏳ Jarayonda</span>;
    }
    return <span className="status-pill new">🔴 Yangi</span>;
  };

  return (
    <div className="page-container support-page">
      {/* Sidebar: Chats List */}
      <div className="support-sidebar glass-card">
        <div className="support-header">
          <div className="support-title-row">
            <h2>Qo'llab-quvvatlash</h2>
          </div>

          {/* Haydovchilar vs Yo'lovchilar tabs */}
          <div className="support-tabs">
            <button
              type="button"
              className={`support-tab-btn ${activeTab === 'driver' ? 'active' : ''}`}
              onClick={() => setActiveTab('driver')}
            >
              <Car size={15} />
              <span>Haydovchilar</span>
              <span className={`tab-badge ${driverNewCount > 0 ? 'has-new' : ''}`}>
                {driverNewCount > 0 ? driverNewCount : tabInquiries.length}
              </span>
            </button>
            <button
              type="button"
              className={`support-tab-btn ${activeTab === 'passenger' ? 'active' : ''}`}
              onClick={() => setActiveTab('passenger')}
            >
              <Users size={15} />
              <span>Yo'lovchilar</span>
              <span className={`tab-badge ${passengerNewCount > 0 ? 'has-new' : ''}`}>
                {passengerNewCount > 0 ? passengerNewCount : inquiries.filter(i => i.sender_type === 'passenger').length}
              </span>
            </button>
          </div>

          <div className="search-box">
            <Search size={16} color="var(--text-muted)" />
            <input 
              type="text" 
              placeholder={activeTab === 'driver' ? "Haydovchi, profil, telefon..." : "Yo'lovchi, telefon..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="chats-list">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              <Loader2 className="spin" size={24} style={{ margin: '0 auto 8px' }} />
              Murojaatlar yuklanmoqda...
            </div>
          ) : filteredInquiries.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              {activeTab === 'driver' 
                ? "Haydovchilardan kelgan murojaatlar yo'q" 
                : "Yo'lovchilardan kelgan murojaatlar yo'q"}
            </div>
          ) : (
            filteredInquiries.map(item => {
              const isDriver = item.sender_type === 'driver';
              const displayName = isDriver 
                ? (item.profile_driver_name ? `${item.profile_driver_name} ${item.profile_driver_car_number ? `(${item.profile_driver_car_number})` : ''}` : item.sender_name || 'Haydovchi')
                : (item.sender_name || "Yo'lovchi");

              return (
                <div 
                  key={item.id} 
                  className={`chat-item ${selectedInquiry?.id === item.id ? 'active' : ''}`}
                  onClick={() => setSelectedId(item.id)}
                >
                  <div className={`chat-avatar ${isDriver ? 'driver' : 'passenger'}`}>
                    {isDriver ? <Car size={20} /> : <User size={20} />}
                  </div>
                  <div className="chat-info">
                    <div className="chat-info-header">
                      <h4>{displayName}</h4>
                      <span className="chat-time">{formatAdminDate(item.created_at)}</span>
                    </div>
                    <div className="chat-info-sub">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        {renderStatusBadge(item.status)}
                        {item.route_number && (
                          <span style={{ fontSize: '11px', color: '#93c5fd', fontWeight: 600 }}>
                            №{item.route_number}
                          </span>
                        )}
                      </div>
                      <p className="last-message">{item.message}</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="support-main glass-card">
        {selectedInquiry ? (
          <>
            {/* Topbar */}
            <div className="chat-topbar">
              <div className="chat-topbar-user">
                <div className={`chat-avatar large ${selectedInquiry.sender_type === 'driver' ? 'driver' : 'passenger'}`}>
                  {selectedInquiry.sender_type === 'driver' ? <Car size={24} /> : <User size={24} />}
                </div>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '17px', fontWeight: 600 }}>
                    {selectedInquiry.sender_type === 'driver' 
                      ? (selectedInquiry.profile_driver_name 
                          ? `${selectedInquiry.profile_driver_name} ${selectedInquiry.profile_driver_car_number ? `(${selectedInquiry.profile_driver_car_number})` : ''}` 
                          : selectedInquiry.sender_name || 'Haydovchi')
                      : (selectedInquiry.sender_name || "Yo'lovchi")}
                  </h3>
                  <div className="chat-user-details">
                    <a 
                      href={`tel:${selectedInquiry.profile_driver_phone || selectedInquiry.sender_phone || ''}`} 
                      className="user-phone"
                    >
                      <Phone size={14} /> 
                      {selectedInquiry.profile_driver_phone || selectedInquiry.sender_phone || 'Telefon yo\'q'}
                    </a>
                    {selectedInquiry.telegram_username && (
                      <span style={{ fontSize: '13px', color: 'var(--primary)' }}>
                        @{selectedInquiry.telegram_username}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="chat-topbar-actions">
                <select 
                  className="status-select"
                  value={selectedInquiry.status}
                  onChange={(e) => handleStatusChange(selectedInquiry.id, e.target.value)}
                >
                  <option value="new">🔴 Yangi</option>
                  <option value="in_progress">⏳ Jarayonda</option>
                  <option value="resolved">✓ Hal qilindi</option>
                </select>

                <button 
                  type="button" 
                  className="btn-delete-inquiry"
                  onClick={() => handleDelete(selectedInquiry.id)}
                  title="Murojaatni o'chirish"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {/* If driver, show explicit profile verification banner */}
            {selectedInquiry.sender_type === 'driver' && (
              <div className="driver-profile-banner">
                <div className="profile-meta-item">
                  <span className="profile-meta-label">Profil egasi:</span>
                  <span className="profile-meta-value">
                    {selectedInquiry.profile_driver_name 
                      ? `${selectedInquiry.profile_driver_name} ${selectedInquiry.profile_driver_car_number ? `(${selectedInquiry.profile_driver_car_number})` : ''}`
                      : selectedInquiry.sender_name || 'Aniqlanmagan'}
                  </span>
                  {selectedInquiry.driver_id && (
                    <span className="profile-badge">ID #{selectedInquiry.driver_id}</span>
                  )}
                </div>

                {selectedInquiry.route_number && (
                  <div className="profile-meta-item">
                    <Route size={15} color="var(--primary)" />
                    <span className="profile-meta-label">Marshrut:</span>
                    <span className="profile-meta-value">
                      №{selectedInquiry.route_number} {selectedInquiry.route_name ? `(${selectedInquiry.route_name})` : ''}
                    </span>
                  </div>
                )}

                {selectedInquiry.telegram_id && (
                  <div className="profile-meta-item">
                    <span className="profile-meta-label">Telegram ID:</span>
                    <span className="profile-meta-value">{selectedInquiry.telegram_id}</span>
                  </div>
                )}
              </div>
            )}

            {/* Conversation / Messages Area */}
            <div className="chat-messages">
              {/* User / Driver's message */}
              <div className="message-bubble-wrapper user">
                <div className="bubble-sender-name">
                  <span>
                    {selectedInquiry.sender_type === 'driver' 
                      ? `🚗 Haydovchi (${selectedInquiry.profile_driver_name || selectedInquiry.sender_name})` 
                      : `👤 Yo'lovchi (${selectedInquiry.sender_name})`}
                  </span>
                </div>
                <div className="message-bubble">
                  <p style={{ margin: 0 }}>{selectedInquiry.message}</p>
                  <span className="msg-time">{formatAdminDate(selectedInquiry.created_at)}</span>
                </div>
              </div>

              {/* Admin reply if already sent */}
              {selectedInquiry.admin_reply && (
                <div className="message-bubble-wrapper admin">
                  <div className="bubble-sender-name" style={{ justifyContent: 'flex-end' }}>
                    <span>🛡️ Yo'lovchi Admin Javobi</span>
                  </div>
                  <div className="message-bubble">
                    <p style={{ margin: 0 }}>{selectedInquiry.admin_reply}</p>
                    <span className="msg-time">{formatAdminDate(selectedInquiry.updated_at || selectedInquiry.created_at)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input area to submit or update reply */}
            <form className="chat-input-area" onSubmit={handleSendReply}>
              <input 
                type="text" 
                placeholder={selectedInquiry.admin_reply ? "Javobni yangilash yoki qo'shimcha yozish..." : "Javob xabarini yozing..."}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
              />
              <button 
                type="submit" 
                className="btn-send-chat" 
                disabled={isSendingReply || !replyText.trim()}
                title="Javob berish"
              >
                {isSendingReply ? <Loader2 size={18} className="spin" /> : <Send size={18} />}
              </button>
            </form>
          </>
        ) : (
          <div className="empty-chat">
            <MessageCircle size={48} color="var(--text-muted)" />
            <h3>Murojaatni tanlang</h3>
            <p>
              {activeTab === 'driver' 
                ? "Haydovchilardan kelgan murojaatni ko'rish va profil ma'lumotlari bilan tanishish uchun ro'yxatdan birortasini tanlang." 
                : "Yo'lovchilardan kelgan murojaatni ko'rish va javob yozish uchun ro'yxatdan birortasini tanlang."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
