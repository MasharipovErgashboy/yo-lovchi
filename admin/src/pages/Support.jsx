import React, { useState } from 'react';
import { Send, User, MessageCircle, Phone, Clock, Search } from 'lucide-react';
import './PagesCommon.css';
import './Support.css';

export default function Support() {
  const [activeChat, setActiveChat] = useState(1);
  const [reply, setReply] = useState('');

  const chats = [
    {
      id: 1,
      type: 'haydovchi',
      name: 'Anvar Tursunov',
      phone: '+998 90 111 22 33',
      lastMessage: 'Assalomu alaykum, ilovada xato chiqyapdi...',
      time: '14:30',
      unread: 2,
      messages: [
        { sender: 'Anvar Tursunov', text: 'Assalomu alaykum, admin!', time: '14:25' },
        { sender: 'Anvar Tursunov', text: 'Ilovada xato chiqyapdi, marshrutni boshlay olmayapman.', time: '14:30' }
      ]
    },
    {
      id: 2,
      type: 'mijoz',
      name: 'Aziza Karimova',
      phone: '+998 99 888 77 66',
      lastMessage: 'Avtobus qachon keladi?',
      time: '12:15',
      unread: 0,
      messages: [
        { sender: 'Aziza Karimova', text: '12-marshrut qachon keladi? Men 20 minut kutdim.', time: '12:15' },
        { sender: 'Admin', text: 'Assalomu alaykum! Haydovchi hozir aylanib o\'tish yo\'lida, tirbandlik sababli biroz kechikadi.', time: '12:20' }
      ]
    },
    {
      id: 3,
      type: 'haydovchi',
      name: 'Dilmurod Karim',
      phone: '+998 94 555 66 77',
      lastMessage: 'Bugun ishga chiqa olmayman.',
      time: 'Kecha',
      unread: 0,
      messages: [
        { sender: 'Dilmurod Karim', text: 'Assalomu alaykum, tobi qochib qoldi, bugun ishga chiqa olmayman.', time: 'Kecha 18:00' },
        { sender: 'Admin', text: 'Tushunarli, tezroq sog\'ayib keting.', time: 'Kecha 18:10' }
      ]
    }
  ];

  const currentChatData = chats.find(c => c.id === activeChat);

  const handleSend = (e) => {
    e.preventDefault();
    if (!reply.trim()) return;
    alert("Javob yuborildi!");
    setReply('');
  };

  return (
    <div className="page-container support-page">
      {/* Sidebar: Chats List */}
      <div className="support-sidebar glass-card">
        <div className="support-header">
          <h2>Murojaatlar</h2>
          <div className="search-box">
            <Search size={18} color="var(--text-muted)" />
            <input type="text" placeholder="Qidirish..." />
          </div>
        </div>

        <div className="chats-list">
          {chats.map(chat => (
            <div 
              key={chat.id} 
              className={`chat-item ${activeChat === chat.id ? 'active' : ''}`}
              onClick={() => setActiveChat(chat.id)}
            >
              <div className="chat-avatar">
                <User size={20} />
                {chat.unread > 0 && <span className="unread-badge">{chat.unread}</span>}
              </div>
              <div className="chat-info">
                <div className="chat-info-header">
                  <h4>{chat.name}</h4>
                  <span className="chat-time">{chat.time}</span>
                </div>
                <div className="chat-info-sub">
                  <span className={`user-type-badge ${chat.type}`}>
                    {chat.type === 'haydovchi' ? 'Haydovchi' : 'Mijoz'}
                  </span>
                  <p className="last-message">{chat.lastMessage}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="support-main glass-card">
        {currentChatData ? (
          <>
            <div className="chat-topbar">
              <div className="chat-topbar-user">
                <div className="chat-avatar large"><User size={24} /></div>
                <div>
                  <h3>{currentChatData.name}</h3>
                  <div className="chat-user-details">
                    <span className={`user-type-badge ${currentChatData.type}`}>
                      {currentChatData.type === 'haydovchi' ? 'Haydovchi' : 'Mijoz'}
                    </span>
                    <span className="user-phone">
                      <Phone size={14} /> {currentChatData.phone}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="chat-messages">
              {currentChatData.messages.map((msg, idx) => {
                const isAdmin = msg.sender === 'Admin';
                return (
                  <div key={idx} className={`message-bubble-wrapper ${isAdmin ? 'admin' : 'user'}`}>
                    <div className="message-bubble">
                      <p>{msg.text}</p>
                      <span className="msg-time">{msg.time}</span>
                    </div>
                  </div>
                )
              })}
            </div>

            <form className="chat-input-area" onSubmit={handleSend}>
              <input 
                type="text" 
                placeholder="Xabar yozish..." 
                value={reply}
                onChange={(e) => setReply(e.target.value)}
              />
              <button type="submit" className="btn-send-chat">
                <Send size={20} />
              </button>
            </form>
          </>
        ) : (
          <div className="empty-chat">
            <MessageCircle size={48} color="var(--text-muted)" />
            <h3>Chatni tanlang</h3>
            <p>Xabarlarni o'qish va javob berish uchun chap tomondagi ro'yxatdan murojaatni tanlang.</p>
          </div>
        )}
      </div>
    </div>
  )
}
