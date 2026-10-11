import { useState } from 'react';
import { Phone, MessageSquare, Send, Bell } from 'lucide-react';

export default function Support() {
  const [subTab, setSubTab] = useState('tizim'); // 'tizim' | 'boglanish'
  const [message, setMessage] = useState('');

  const systemMessages = [
    { id: 1, title: 'Yangi marshrut', text: '12-marshrut qatnovi 10 daqiqadan keyin boshlanadi.', time: 'Bugun, 08:00' },
    { id: 2, title: 'Tirbandlik', text: 'Shahar markazida tirbandlik sababli ba\'zi avtobuslar kechikishi mumkin.', time: 'Kecha, 18:30' }
  ];

  const handleSend = (e) => {
    e.preventDefault();
    if (message.trim()) {
      alert("Xabaringiz yuborildi!");
      setMessage('');
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
            {systemMessages.length > 0 ? systemMessages.map(msg => (
              <div key={msg.id} className="sys-msg-card">
                <div className="sys-msg-header">
                  <h4>{msg.title}</h4>
                  <span>{msg.time}</span>
                </div>
                <p>{msg.text}</p>
              </div>
            )) : (
              <div className="empty-state">Hozircha tizim xabarlari yo'q</div>
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

            <form className="message-form" onSubmit={handleSend}>
              <h4>Xabar yuborish</h4>
              <textarea 
                placeholder="Savol yoki taklifingizni yozing..." 
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows="4"
              ></textarea>
              <button type="submit" className="send-btn">
                <Send size={18} /> Yuborish
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
