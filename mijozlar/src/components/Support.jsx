import { useState, useEffect } from 'react';
import { Phone, MessageSquare, Send, Bell, Loader2, CheckCircle2, AlertCircle, Info } from 'lucide-react';

export default function Support() {
  const [subTab, setSubTab] = useState('tizim'); // 'tizim' | 'boglanish'
  const [systemMessages, setSystemMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Inquiry form states
  const [senderName, setSenderName] = useState(() => {
    const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
    if (tgUser) {
      return `${tgUser.first_name || ''} ${tgUser.last_name || ''}`.trim();
    }
    return '';
  });
  const [senderPhone, setSenderPhone] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  const fetchMessages = async () => {
    try {
      const res = await fetch('/api/passenger-messages');
      if (res.ok) {
        const data = await res.json();
        setSystemMessages(data || []);
      }
    } catch (e) {
      console.warn("Tizim xabarlarini yuklashda xatolik:", e);
    }
  };

  useEffect(() => {
    setLoadingMessages(true);
    fetchMessages().finally(() => setLoadingMessages(false));
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!message.trim()) {
      alert("Iltimos, xabaringizni yozing!");
      return;
    }

    setSending(true);
    try {
      const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
      const res = await fetch('/api/support-inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_type: 'passenger',
          sender_name: senderName.trim() || "Yo'lovchi",
          sender_phone: senderPhone.trim() || null,
          telegram_id: tgUser?.id || null,
          message: message.trim()
        })
      });

      if (res.ok) {
        setSentSuccess(true);
        setMessage('');
        setTimeout(() => setSentSuccess(false), 4000);
      } else {
        alert("Xabar yuborishda xatolik yuz berdi. Qayta urinib ko'ring.");
      }
    } catch (err) {
      console.error("Support send error:", err);
      alert("Internet aloqasini tekshiring!");
    } finally {
      setSending(false);
    }
  };

  const formatMsgTime = (timestamp) => {
    if (!timestamp) return '';
    try {
      const d = new Date(timestamp);
      return d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }) + ' ' + 
             d.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit' });
    } catch {
      return String(timestamp);
    }
  };

  return (
    <div className="support-container">
      <div className="support-tabs">
        <button 
          className={`sub-tab-btn ${subTab === 'tizim' ? 'active' : ''}`}
          onClick={() => setSubTab('tizim')}
        >
          <Bell size={16} />
          Tizim xabarlari
          {systemMessages.length > 0 && (
            <span style={{
              background: '#0066FF',
              color: '#fff',
              fontSize: '11px',
              padding: '1px 6px',
              borderRadius: '10px',
              marginLeft: '4px'
            }}>
              {systemMessages.length}
            </span>
          )}
        </button>
        <button 
          className={`sub-tab-btn ${subTab === 'boglanish' ? 'active' : ''}`}
          onClick={() => setSubTab('boglanish')}
        >
          <MessageSquare size={16} />
          Bog'lanish
        </button>
      </div>

      <div className="support-content">
        {subTab === 'tizim' ? (
          <div className="system-messages">
            {loadingMessages && systemMessages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-secondary)' }}>
                <Loader2 className="animate-spin" size={24} style={{ margin: '0 auto 8px' }} />
                <p style={{ margin: 0, fontSize: '13px' }}>Xabarlar yuklanmoqda...</p>
              </div>
            ) : systemMessages.length > 0 ? (
              systemMessages.map(msg => (
                <div 
                  key={msg.id} 
                  className="sys-msg-card"
                  style={{
                    borderLeft: `4px solid ${
                      msg.type === 'alert' ? '#ef4444' :
                      msg.type === 'warning' ? '#f59e0b' :
                      msg.type === 'info' ? '#10b981' : '#0066FF'
                    }`
                  }}
                >
                  <div className="sys-msg-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {msg.type === 'alert' ? <AlertCircle size={16} color="#ef4444" /> :
                       msg.type === 'warning' ? <AlertCircle size={16} color="#f59e0b" /> :
                       msg.type === 'info' ? <Info size={16} color="#10b981" /> :
                       <Bell size={16} color="#0066FF" />}
                      <h4>{msg.title}</h4>
                    </div>
                    <span>{formatMsgTime(msg.created_at)}</span>
                  </div>
                  <p>{msg.message}</p>
                </div>
              ))
            ) : (
              <div className="empty-state" style={{ padding: '40px 20px', textAlign: 'center' }}>
                <Bell size={32} color="#94a3b8" style={{ margin: '0 auto 8px', display: 'block' }} />
                Hozircha tizim xabarlari yo'q
              </div>
            )}
          </div>
        ) : (
          <div className="contact-section">
            <div className="contact-card">
              <Phone size={24} color="var(--blue-primary)" />
              <div className="contact-info">
                <h3>Dispetcher bilan bog'lanish</h3>
                <a href="tel:+998901234567">+998 90 123 45 67</a>
              </div>
            </div>

            {sentSuccess ? (
              <div style={{
                background: '#ecfdf5',
                border: '1px solid #10b981',
                borderRadius: '12px',
                padding: '20px',
                textAlign: 'center',
                color: '#065f46'
              }}>
                <CheckCircle2 size={36} color="#10b981" style={{ margin: '0 auto 8px', display: 'block' }} />
                <h4 style={{ margin: '0 0 6px 0', fontSize: '16px' }}>Xabaringiz yuborildi!</h4>
                <p style={{ margin: 0, fontSize: '13px' }}>
                  Dispetcher xabaringizni qabul qildi va tez orada ko'rib chiqadi.
                </p>
              </div>
            ) : (
              <form className="message-form" onSubmit={handleSend}>
                <h4>Xabar yoki taklif yuborish</h4>
                
                <input 
                  type="text"
                  placeholder="Ismingiz (ixtiyoriy)"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    fontSize: '14px',
                    marginBottom: '10px',
                    boxSizing: 'border-box'
                  }}
                />

                <input 
                  type="tel"
                  placeholder="Telefon raqamingiz (ixtiyoriy)"
                  value={senderPhone}
                  onChange={(e) => setSenderPhone(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    fontSize: '14px',
                    marginBottom: '10px',
                    boxSizing: 'border-box'
                  }}
                />

                <textarea 
                  placeholder="Savol yoki taklifingizni yozing..." 
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows="4"
                  required
                ></textarea>

                <button 
                  type="submit" 
                  className="send-btn"
                  disabled={sending}
                  style={{ opacity: sending ? 0.7 : 1 }}
                >
                  {sending ? (
                    <>
                      <Loader2 size={18} className="animate-spin" /> Yuborilmoqda...
                    </>
                  ) : (
                    <>
                      <Send size={18} /> Yuborish
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
