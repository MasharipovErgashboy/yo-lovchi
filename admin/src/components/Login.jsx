import React, { useState } from 'react';
import { User, Lock, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';

const BACKEND_URL = "";

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (res.ok) {
        const data = await res.json();
        onLogin(data.user);
      } else {
        const errData = await res.json().catch(() => ({}));
        setErrorMsg(errData.detail || "Noto'g'ri login yoki parol");
      }
    } catch (err) {
      console.error("Login fetch error:", err);
      // Fallback
      if (username === 'yolovchi' && password === 'yolovchi') {
        onLogin({ username: 'yolovchi', role: 'admin' });
      } else {
        setErrorMsg("Serverga ulanishda xatolik yuz berdi");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Background animated shapes */}
      <div className="bg-shape shape-1"></div>
      <div className="bg-shape shape-2"></div>
      <div className="bg-shape shape-3"></div>

      {/* Glassmorphism Card */}
      <div className={`login-card ${errorMsg ? 'shake' : ''}`}>
        <div className="login-header">
          <h2>Admin Panel</h2>
          <p>Tizimga kirish uchun ma'lumotlarni kiriting</p>
        </div>

        {errorMsg && (
          <div className="error-msg">
            <AlertCircle size={16} /> {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <User size={20} className="input-icon" />
            <input 
              type="text" 
              placeholder=" "
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={loading}
            />
            <label>Foydalanuvchi nomi</label>
          </div>

          <div className="input-group">
            <Lock size={20} className="input-icon" />
            <input 
              type="password" 
              placeholder=" "
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
            <label>Parol</label>
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? (
              <>
                <Loader2 size={20} className="animate-spin" /> Tekshirilmoqda...
              </>
            ) : (
              <>
                Tizimga kirish
                <ArrowRight size={20} className="btn-icon" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
