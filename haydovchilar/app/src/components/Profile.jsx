import { useMemo, useState } from 'react'
import { User, Bus, Headphones, ChevronRight, X, Phone, Send, CheckCircle2 } from 'lucide-react'

export default function Profile() {
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [helpMessage, setHelpMessage] = useState('');
  const [messageSent, setMessageSent] = useState(false);

  const { name: fullName, phone } = useMemo(() => {
    // 1. Try URL parameters first (passed by our bot)
    const params = new URLSearchParams(window.location.search);
    const urlName = params.get('name');
    const urlSurname = params.get('surname') || '';
    const urlPhone = params.get('phone');
    
    // 2. Fallback to Telegram user info or mock
    const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
    
    let finalName = '';
    if (urlName) {
      finalName = `${urlName} ${urlSurname}`.trim();
    } else if (tgUser && tgUser.first_name) {
      finalName = `${tgUser.first_name} ${tgUser.last_name || ''}`.trim();
    } else {
      finalName = "Ergashbek Karimov";
    }

    const finalPhone = urlPhone || "+998 90 123 45 67";
    
    return { name: finalName, phone: finalPhone };
  }, []);

  const handleSendMessage = () => {
    if (!helpMessage.trim()) return;
    // Here we would normally send to API. For now, simulate success
    setMessageSent(true);
    // Reset after some time if they close and reopen? Or just let them close it.
  };

  const closeHelpModal = () => {
    setShowHelpModal(false);
    setTimeout(() => {
      setMessageSent(false);
      setHelpMessage('');
    }, 300); // Reset after closing animation
  };

  return (
    <>
      <div className="profile-container">
        {/* Abstract background shape */}
        <div className="profile-bg-shape"></div>

        <div className="header-container profile-header">
          <h1 className="header-title">Profil</h1>
          <div className="header-subtitle">Shaxsiy ma'lumotlaringiz</div>
        </div>

        <div className="profile-content">
          {/* User Card */}
          <div className="profile-card user-info-card">
            <div className="user-avatar-wrapper">
              <div className="user-avatar">
                <User size={32} color="var(--blue-primary)" />
              </div>
              <div className="online-dot"></div>
            </div>
            <div className="user-details">
              <div className="user-name">{fullName}</div>
              <div className="user-phone">{phone}</div>
            </div>
          </div>

          {/* Route Card */}
          <div className="profile-card interactive-card">
            <div className="card-icon-wrapper bg-blue">
              <Bus size={24} color="white" />
            </div>
            <div className="card-info">
              <span className="card-label">Marshrut</span>
              <span className="card-title">12-marshrut</span>
              <span className="card-desc">Toshkent &rarr; Chirchiq</span>
            </div>
            <ChevronRight size={20} color="var(--text-secondary)" className="chevron" />
          </div>

          {/* Help Card */}
          <div className="profile-card interactive-card" onClick={() => setShowHelpModal(true)}>
            <div className="card-icon-wrapper bg-blue-light">
              <Headphones size={24} color="var(--blue-primary)" />
            </div>
            <div className="card-info">
              <span className="card-title mt-0">Yordam</span>
              <span className="card-desc">Savollar va muammolar uchun</span>
            </div>
            <ChevronRight size={20} color="var(--text-secondary)" className="chevron" />
          </div>
        </div>
      </div>

      {showHelpModal && (
        <div className="modal-overlay" onClick={closeHelpModal}>
          <div className="modal-content help-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={closeHelpModal}>
              <X size={18} />
            </button>

            {messageSent ? (
              <div className="success-state">
                <div className="success-icon-wrapper">
                  <CheckCircle2 size={40} color="var(--green)" />
                </div>
                <h3 className="modal-title mt-16">Xabar yuborildi!</h3>
                <p className="modal-time mb-24">Tez orada operatorlarimiz siz bilan bog'lanishadi.</p>
                <button className="btn-primary w-full" onClick={closeHelpModal}>
                  Yopish
                </button>
              </div>
            ) : (
              <>
                <h3 className="modal-title">Yordam markazi</h3>
                <p className="modal-time">Savol yoki muammolaringizni hal qilishga tayyormiz</p>
                
                {/* Call action */}
                <button 
                  className="help-call-btn" 
                  onClick={() => window.location.href = 'tel:+998901234567'}
                  style={{ textAlign: 'left' }}
                >
                  <div className="call-icon-bg">
                    <Phone size={20} color="var(--white)" fill="currentColor" />
                  </div>
                  <div className="call-text">
                    <span className="call-title">Operatorga qo'ng'iroq</span>
                    <span className="call-sub">+998 90 123 45 67</span>
                  </div>
                  <ChevronRight size={18} color="var(--text-secondary)" />
                </button>

                <div className="divider">
                  <span>yoki xabar yozing</span>
                </div>

                <textarea 
                  className="help-textarea" 
                  placeholder="Muammoingizni bu yerga batafsil yozing..."
                  value={helpMessage}
                  onChange={(e) => setHelpMessage(e.target.value)}
                ></textarea>

                <button 
                  className="btn-primary w-full" 
                  onClick={handleSendMessage}
                  style={{ opacity: helpMessage.trim() ? 1 : 0.6 }}
                >
                  <Send size={18} /> Xabarni yuborish
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
