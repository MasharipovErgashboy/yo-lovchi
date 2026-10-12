import React, { useState, useEffect } from 'react';
import { Send, MessageSquare, AlertCircle, CheckCircle2, Info, Bell, RefreshCw, Loader2 } from 'lucide-react';
import './PagesCommon.css';
import './Messages.css';

const BACKEND_URL = "";

export default function Messages() {
  const [target, setTarget] = useState('all');
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [msgType, setMsgType] = useState('system');
  const [drivers, setDrivers] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [successNotice, setSuccessNotice] = useState('');

  const fetchDrivers = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/drivers`);
      if (res.ok) {
        const data = await res.json();
        setDrivers(data || []);
        if (data.length > 0 && !selectedDriverId) {
          setSelectedDriverId(data[0].id);
        }
      }
    } catch (e) {
      console.error("Haydovchilarni yuklashda xatolik:", e);
    }
  };

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${BACKEND_URL}/api/messages`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data || []);
      }
    } catch (e) {
      console.error("Xabarlar tarixini yuklashda xatolik:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
    fetchHistory();
    const interval = setInterval(fetchHistory, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      alert("Iltimos, xabar mavzusi va matnini to'liq kiriting!");
      return;
    }

    if (target === 'driver' && !selectedDriverId) {
      alert("Iltimos, haydovchini tanlang!");
      return;
    }

    setIsSending(true);
    try {
      const payload = {
        title: title.trim(),
        message: message.trim(),
        type: msgType,
        target_type: target,
        driver_id: target === 'driver' ? parseInt(selectedDriverId) : null
      };

      const res = await fetch(`${BACKEND_URL}/api/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setTitle('');
        setMessage('');
        setSuccessNotice("Xabar muvaffaqiyatli yuborildi!");
        setTimeout(() => setSuccessNotice(''), 3000);
        fetchHistory();
      } else {
        alert("Xabar yuborishda xatolik yuz berdi!");
      }
    } catch (err) {
      console.error("Send message error:", err);
      alert("Server bilan bog'lanishda xatolik yuz berdi!");
    } finally {
      setIsSending(false);
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
      const year = d.getFullYear();
      return `${day}.${month}.${year} ${h}:${m}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="page-container">
      <div className="messages-layout">
        <div className="glass-card compose-section">
          <div className="card-header" style={{ marginBottom: '24px' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <MessageSquare color="var(--primary)" />
              Yangi Xabar Yuborish
            </h2>
          </div>

          {successNotice && (
            <div style={{
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid #10b981',
              color: '#10b981',
              padding: '12px 16px',
              borderRadius: '12px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <CheckCircle2 size={18} />
              <span>{successNotice}</span>
            </div>
          )}

          <form onSubmit={handleSend} className="message-form">
            <div className="form-group">
              <label>Kimga yuborilmoqda?</label>
              <div className="radio-group">
                <label className={`radio-label ${target === 'all' ? 'selected' : ''}`}>
                  <input 
                    type="radio" 
                    name="target" 
                    value="all" 
                    checked={target === 'all'} 
                    onChange={(e) => setTarget(e.target.value)} 
                  />
                  <span>Barcha haydovchilar ({drivers.length} ta)</span>
                </label>
                <label className={`radio-label ${target === 'driver' ? 'selected' : ''}`}>
                  <input 
                    type="radio" 
                    name="target" 
                    value="driver" 
                    checked={target === 'driver'} 
                    onChange={(e) => setTarget(e.target.value)} 
                  />
                  <span>Muayyan haydovchi</span>
                </label>
              </div>
            </div>

            {target === 'driver' && (
              <div className="form-group slide-down">
                <label>Haydovchini tanlang</label>
                <select 
                  className="custom-select"
                  value={selectedDriverId}
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                >
                  {drivers.length === 0 ? (
                    <option value="">Tasdiqlangan haydovchilar yo'q</option>
                  ) : (
                    drivers.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name} {d.surname} ({d.phone})
                      </option>
                    ))
                  )}
                </select>
              </div>
            )}

            <div className="form-group">
              <label>Xabar turi</label>
              <div className="radio-group">
                <label className={`radio-label ${msgType === 'system' ? 'selected' : ''}`}>
                  <input type="radio" value="system" checked={msgType === 'system'} onChange={() => setMsgType('system')} />
                  <span>📢 Tizim xabari</span>
                </label>
                <label className={`radio-label ${msgType === 'alert' ? 'selected' : ''}`}>
                  <input type="radio" value="alert" checked={msgType === 'alert'} onChange={() => setMsgType('alert')} />
                  <span>⚠️ Ogohlantirish</span>
                </label>
                <label className={`radio-label ${msgType === 'info' ? 'selected' : ''}`}>
                  <input type="radio" value="info" checked={msgType === 'info'} onChange={() => setMsgType('info')} />
                  <span>ℹ️ Ma'lumot</span>
                </label>
              </div>
            </div>

            <div className="form-group">
              <label>Xabar mavzusi (Sarlavha)</label>
              <input 
                type="text"
                className="custom-select"
                style={{ height: '48px' }}
                placeholder="Masalan: Tirbandlik haqida ogohlantirish"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Xabar matni</label>
              <textarea 
                className="custom-textarea"
                rows="5"
                placeholder="Xabaringizni to'liq shu yerga yozing..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
              ></textarea>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button type="submit" className="btn-send" disabled={isSending}>
                {isSending ? (
                  <>Yuborilmoqda... <Loader2 size={18} className="spin" /></>
                ) : (
                  <>Yuborish <Send size={18} /></>
                )}
              </button>
            </div>
          </form>
        </div>

        <div className="glass-card history-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3>Oxirgi yuborilgan xabarlar</h3>
            <button 
              onClick={fetchHistory}
              className="action-btn"
              style={{ width: '30px', height: '30px', padding: 0 }}
              title="Yangilash"
            >
              <RefreshCw size={14} />
            </button>
          </div>

          <div className="history-list">
            {history.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Hozircha xabarlar yuborilmagan
              </div>
            ) : (
              history.map(item => (
                <div className="history-item" key={item.id}>
                  <div className="history-header">
                    <span className="history-target">
                      {item.target_type === 'all' 
                        ? '📢 Barchaga' 
                        : `👤 ${item.driver_name || 'Haydovchi'} ${item.driver_surname || ''}`}
                    </span>
                    <span className="history-date">{formatAdminDate(item.created_at)}</span>
                  </div>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '15px', color: 'var(--text-main)', fontWeight: 600 }}>
                    {item.title}
                  </h4>
                  <p>{item.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
