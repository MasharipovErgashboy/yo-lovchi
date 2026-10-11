import { useState } from 'react'
import { MessageCircle, Bell, AlertTriangle, User, Bus, CheckCircle2, Info, ChevronRight, X } from 'lucide-react'

export default function Messages() {
  const [activeMsgTab, setActiveMsgTab] = useState('barchasi');
  const [selectedMessage, setSelectedMessage] = useState(null);

  const messages = [
    {
      id: 1,
      type: 'alert',
      icon: <AlertTriangle size={24} color="white" />,
      modalIcon: <AlertTriangle size={32} color="white" />,
      color: 'var(--red)',
      bgLight: 'var(--red-light)',
      title: 'Siz marshrutdan chiqdingiz',
      desc: 'Iltimos, marshrut bo\'yicha harakatlaning.',
      fullDesc: 'Iltimos, belgilangan marshrut bo\'yicha harakatlaning. Yo\'nalishdan chiqqan holatda sizning mashinangiz yo\'lovchilar xaritasida ko\'rinmaydi.',
      time: '09:20',
      unreadDot: true
    },
    {
      id: 2,
      type: 'user',
      icon: <User size={24} color="var(--blue-primary)" />,
      modalIcon: <User size={32} color="white" />,
      color: 'var(--blue-light)',
      modalColor: 'var(--blue-primary)',
      bgLight: 'var(--blue-light)',
      title: 'Yo\'lovchi',
      desc: '5-bekatga qachon yetib kelasiz?',
      fullDesc: 'Assalomu alaykum! Men hozir 5-bekatdaman. Qachon yetib kelasiz? Kutib turibman.',
      time: '09:15',
      badge: 2
    },
    {
      id: 3,
      type: 'system',
      icon: <Bus size={24} color="white" />,
      modalIcon: <Bus size={32} color="white" />,
      color: 'var(--blue-primary)',
      modalColor: 'var(--blue-primary)',
      bgLight: 'var(--blue-light)',
      title: 'Tizim xabari',
      desc: '12-marshrut bo\'yicha harakat davom etmoqda.',
      fullDesc: 'Tizim xabari: 12-marshrut bo\'yicha harakat to\'g\'ri davom etmoqda. Barchasi joyida.',
      time: '08:50'
    },
    {
      id: 4,
      type: 'user',
      icon: <User size={24} color="var(--blue-primary)" />,
      modalIcon: <User size={32} color="white" />,
      color: 'var(--blue-light)',
      modalColor: 'var(--blue-primary)',
      bgLight: 'var(--blue-light)',
      title: 'Yo\'lovchi',
      desc: 'Assalomu alaykum, Chirchiqqa nechchi daqiqada yetib borasiz?',
      fullDesc: 'Assalomu alaykum, Chirchiqqa nechchi daqiqada yetib borasiz? Iltimos aytib yuboring.',
      time: '08:32',
      badge: 1
    },
    {
      id: 5,
      type: 'success',
      icon: <CheckCircle2 size={24} color="white" />,
      modalIcon: <CheckCircle2 size={32} color="white" />,
      color: 'var(--green)',
      modalColor: 'var(--green)',
      bgLight: 'var(--green-light)',
      title: 'Tizim xabari',
      desc: 'Joylashuvingiz muvaffaqiyatli yoqildi. Endi siz yo\'lovchilar xaritasida ko\'rinasiz.',
      fullDesc: 'Joylashuvingiz muvaffaqiyatli yoqildi. Endi siz yo\'lovchilar xaritasida ko\'rinasiz. Xavfsiz harakatlaning.',
      time: '08:10'
    },
    {
      id: 6,
      type: 'info',
      icon: <Info size={24} color="white" />,
      modalIcon: <Info size={32} color="white" />,
      color: 'var(--orange)',
      modalColor: 'var(--orange)',
      bgLight: 'var(--orange-light)',
      title: 'Tizim xabari',
      desc: 'Mashina holati "Ozroq joy bor" holatiga o\'zgartirildi.',
      fullDesc: 'Mashina holati muvaffaqiyatli "Ozroq joy bor" holatiga o\'zgartirildi. Yo\'lovchilar buni xaritada ko\'radi.',
      time: '07:45'
    },
    {
      id: 7,
      type: 'user',
      icon: <User size={24} color="var(--blue-primary)" />,
      modalIcon: <User size={32} color="white" />,
      color: 'var(--blue-light)',
      modalColor: 'var(--blue-primary)',
      bgLight: 'var(--blue-light)',
      title: 'Yo\'lovchi',
      desc: 'Keyingi bekat qaysi?',
      fullDesc: 'Keyingi bekat qaysi? O\'sha bekatdan chiqib ketmoqchiman.',
      time: '07:30'
    },
    {
      id: 8,
      type: 'system-gray',
      icon: <Bus size={24} color="white" />,
      modalIcon: <Bus size={32} color="white" />,
      color: 'var(--text-secondary)',
      modalColor: 'var(--text-secondary)',
      bgLight: '#F3F4F6',
      title: 'Tizim xabari',
      desc: 'Reys boshlandi. Xavfsiz va muvaffaqiyatli yo\'l!',
      fullDesc: 'Reys boshlandi. Xavfsiz va muvaffaqiyatli yo\'l tilaymiz! Yo\'lovchilar bilan xushmuomala bo\'ling.',
      time: '07:10'
    }
  ];

  const filteredMessages = messages.filter(msg => {
    if (activeMsgTab === 'tizim') return msg.type !== 'user';
    return true;
  });

  return (
    <>
      <div className="messages-container">
        <div className="messages-sticky-header">
          <div className="header-container" style={{ marginBottom: 0 }}>
            <h1 className="header-title">Xabarlar</h1>
            <div className="header-subtitle">Tizim va yo'lovchilardan xabarlar</div>
          </div>

          <div className="tabs-container">
            <button 
              className={`tab-btn ${activeMsgTab === 'barchasi' ? 'active' : ''}`}
              onClick={() => setActiveMsgTab('barchasi')}
            >
              <MessageCircle size={18} fill="currentColor" /> Barchasi
            </button>
            <button 
              className={`tab-btn ${activeMsgTab === 'tizim' ? 'active' : ''}`}
              onClick={() => setActiveMsgTab('tizim')}
            >
              <Bell size={18} fill="currentColor" /> Tizim
            </button>
          </div>
        </div>

        <div className="messages-list-wrapper">
          <div className="messages-list">
            {filteredMessages.length > 0 ? (
              filteredMessages.map((msg) => (
                <div className="message-item" key={msg.id} onClick={() => setSelectedMessage(msg)}>
                  <div className="message-icon-wrapper" style={{ backgroundColor: msg.color }}>
                    {msg.icon}
                  </div>
                  
                  <div className="message-content">
                    <div className="message-header">
                      <span className="message-title">{msg.title}</span>
                      <span className="message-time">{msg.time}</span>
                    </div>
                    <div className="message-body">
                      <span className="message-desc">{msg.desc}</span>
                      <div className="message-right">
                        {msg.unreadDot && <div className="unread-dot"></div>}
                        {msg.badge && <div className="unread-badge">{msg.badge}</div>}
                        <ChevronRight size={16} color="var(--text-secondary)" className="chevron" />
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>Xabarlar yo'q</div>
            )}
          </div>
        </div>
      </div>

      {selectedMessage && (
        <div className="modal-overlay" onClick={() => setSelectedMessage(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setSelectedMessage(null)}>
              <X size={18} />
            </button>
            
            <div className="modal-pulse-wrapper">
              <div className="modal-pulse-1" style={{ backgroundColor: selectedMessage.modalColor || selectedMessage.color }}></div>
              <div className="modal-pulse-2" style={{ backgroundColor: selectedMessage.modalColor || selectedMessage.color }}></div>
              <div className="modal-pulse-3" style={{ backgroundColor: selectedMessage.modalColor || selectedMessage.color }}>
                {selectedMessage.modalIcon}
              </div>
            </div>

            <h3 className="modal-title">{selectedMessage.title}</h3>
            <div className="modal-time">{selectedMessage.time}</div>

            <div className="modal-desc-box" style={{ backgroundColor: selectedMessage.bgLight }}>
              {selectedMessage.fullDesc}
            </div>

            <button className="btn-primary" onClick={() => setSelectedMessage(null)}>
              Tushunarli
            </button>
          </div>
        </div>
      )}
    </>
  )
}
