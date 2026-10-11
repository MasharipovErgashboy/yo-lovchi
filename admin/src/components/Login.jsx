import React, { useState } from 'react';
import { User, Lock, ArrowRight, AlertCircle } from 'lucide-react';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username === 'yolovchi' && password === 'yolovchi') {
      onLogin();
    } else {
      setError(true);
      setTimeout(() => setError(false), 3000);
    }
  }

  return (
    <div className="login-container">
      {/* Background animated shapes */}
      <div className="bg-shape shape-1"></div>
      <div className="bg-shape shape-2"></div>
      <div className="bg-shape shape-3"></div>

      {/* Glassmorphism Card */}
      <div className={`login-card ${error ? 'shake' : ''}`}>
        <div className="login-header">
          <h2>Admin Panel</h2>
          <p>Tizimga kirish uchun ma'lumotlarni kiriting</p>
        </div>

        {error && (
          <div className="error-msg">
            <AlertCircle size={16} /> Noto'g'ri login yoki parol
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
            />
            <label>Parol</label>
          </div>

          <button type="submit" className="login-btn">
            Tizimga kirish
            <ArrowRight size={20} className="btn-icon" />
          </button>
        </form>
      </div>
    </div>
  )
}
