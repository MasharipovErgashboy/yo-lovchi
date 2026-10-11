import React, { useState } from 'react';
import { Send, MessageSquare } from 'lucide-react';
import './PagesCommon.css';
import './Messages.css';

export default function Messages() {
  const [target, setTarget] = useState('all');
  const [message, setMessage] = useState('');

  const handleSend = (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    alert("Xabar yuborildi!");
    setMessage('');
  }

  return (
    <div className="page-container">
      <div className="messages-layout">
        <div className="glass-card compose-section">
          <div className="card-header" style={{ marginBottom: '32px' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <MessageSquare color="var(--primary)" />
              Yangi Xabar Yuborish
            </h2>
          </div>

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
                  <span>Barcha haydovchilar</span>
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
                <select className="custom-select">
                  <option value="1">Ergashboy Masharipov</option>
                  <option value="2">Anvar Tursunov</option>
                </select>
              </div>
            )}

            <div className="form-group">
              <label>Xabar matni</label>
              <textarea 
                className="custom-textarea"
                rows="6"
                placeholder="Xabaringizni shu yerga yozing..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              ></textarea>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button type="submit" className="btn-send">
                Yuborish <Send size={18} />
              </button>
            </div>
          </form>
        </div>

        <div className="glass-card history-section">
          <h3>Oxirgi yuborilgan xabarlar</h3>
          <div className="history-list">
            <div className="history-item">
              <div className="history-header">
                <span className="history-target">Barchaga</span>
                <span className="history-date">Kecha, 15:00</span>
              </div>
              <p>Hurmatli haydovchilar, bugun soat 18:00 dan boshlab markaziy ko'chada tirbandlik kutilmoqda. Yo'nalishni o'zgartirishingizni so'raymiz.</p>
            </div>
            <div className="history-item">
              <div className="history-header">
                <span className="history-target">12-marshrut</span>
                <span className="history-date">2 kun oldin</span>
              </div>
              <p>Ertaga bekatlar ro'yxatida o'zgarish bo'ladi, ilovani yangilang.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
