import React from 'react';
import { Users, UserCheck, UserX, Map, Navigation } from 'lucide-react';
import './Dashboard.css';

export default function Dashboard() {
  const stats = [
    { label: 'Umumiy Haydovchilar', value: '124', icon: <Users size={24} />, color: 'var(--primary)' },
    { label: 'Faol (Online)', value: '78', icon: <UserCheck size={24} />, color: '#10b981' },
    { label: 'Offline', value: '46', icon: <UserX size={24} />, color: '#64748b' },
    { label: 'Hozir yo\'lda', value: '63', icon: <Navigation size={24} />, color: '#f59e0b' },
  ];

  return (
    <div className="dashboard-page">
      <div className="stats-grid">
        {stats.map((stat, i) => (
          <div key={i} className="stat-card" style={{ '--accent': stat.color }}>
            <div className="stat-icon" style={{ backgroundColor: `${stat.color}20`, color: stat.color }}>
              {stat.icon}
            </div>
            <div className="stat-info">
              <h3>{stat.value}</h3>
              <p>{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-charts">
        <div className="chart-card glass-card">
          <h3>Haftalik faollik</h3>
          <div className="chart-placeholder">
            <div className="bars">
              {[40, 70, 45, 90, 65, 85, 100].map((h, idx) => (
                <div key={idx} className="bar" style={{ height: `${h}%` }}></div>
              ))}
            </div>
            <div className="days">
              <span>Du</span><span>Se</span><span>Ch</span><span>Pa</span><span>Ju</span><span>Sh</span><span>Ya</span>
            </div>
          </div>
        </div>

        <div className="chart-card glass-card">
          <h3>Oxirgi harakatlar</h3>
          <div className="list-placeholder">
            <div className="list-item">
              <div className="activity-icon bg-green"><UserCheck size={16} /></div>
              <div className="activity-text">
                <p className="activity-title">Ergashboy Masharipov tasdiqlandi</p>
                <p className="activity-time">10 daqiqa oldin</p>
              </div>
            </div>
            <div className="list-item">
              <div className="activity-icon bg-blue"><Map size={16} /></div>
              <div className="activity-text">
                <p className="activity-title">Yangi marshrut qo'shildi (18-marshrut)</p>
                <p className="activity-time">1 soat oldin</p>
              </div>
            </div>
            <div className="list-item">
              <div className="activity-icon bg-purple"><Users size={16} /></div>
              <div className="activity-text">
                <p className="activity-title">3 ta yangi haydovchi nomzodi</p>
                <p className="activity-time">Kecha, 14:30</p>
              </div>
            </div>
          </div>
        </div>

        <div className="chart-card glass-card">
          <h3>Tizim holati</h3>
          <div className="system-status">
            <div className="status-item">
              <span className="status-label">Server holati</span>
              <span className="status-value text-green">Meyorda (99.9%)</span>
            </div>
            <div className="status-item">
              <span className="status-label">O'rtacha javob vaqti</span>
              <span className="status-value">124 ms</span>
            </div>
            <div className="status-item">
              <span className="status-label">Xotira bandligi</span>
              <span className="status-value">45%</span>
            </div>
            <div className="status-item">
              <span className="status-label">Ma'lumotlar bazasi</span>
              <span className="status-value text-green">Faol</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
