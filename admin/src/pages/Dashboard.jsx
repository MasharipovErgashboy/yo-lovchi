import React, { useState, useEffect } from 'react';
import { Users, UserCheck, UserX, Map, Navigation, Clock, ShieldCheck, Route, FileText } from 'lucide-react';
import './Dashboard.css';

const BACKEND_URL = "";

export default function Dashboard() {
  const [statsData, setStatsData] = useState({
    total_drivers: 0,
    online_drivers: 0,
    offline_drivers: 0,
    on_road: 0,
    total_routes: 0,
    pending_candidates: 0,
    recent_activities: []
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/dashboard/stats`);
      if (res.ok) {
        const data = await res.json();
        setStatsData(data);
      }
    } catch (e) {
      console.error("Dashboard statistikalarini yuklashda xatolik:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Real-time auto-refresh every 5 seconds
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const stats = [
    { label: 'Umumiy Haydovchilar', value: statsData.total_drivers, icon: <Users size={24} />, color: 'var(--primary)' },
    { label: 'Faol (Online)', value: statsData.online_drivers, icon: <UserCheck size={24} />, color: '#10b981' },
    { label: 'Offline', value: statsData.offline_drivers, icon: <UserX size={24} />, color: '#64748b' },
    { label: 'Hozir yo\'lda', value: statsData.on_road, icon: <Navigation size={24} />, color: '#f59e0b' },
  ];

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    try {
      let str = String(dateStr).trim();
      if (!str.endsWith('Z') && !str.includes('+')) {
        str = str.replace(' ', 'T') + 'Z';
      }
      const d = new Date(str);
      if (isNaN(d.getTime())) return dateStr;
      const now = new Date();
      const diffSec = Math.floor((now - d) / 1000);
      if (diffSec < 60) return "Hozirgina";
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)} daqiqa oldin`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} soat oldin`;
      return `${Math.floor(diffSec / 86400)} kun oldin`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="dashboard-page">
      <div className="stats-grid">
        {stats.map((stat, i) => (
          <div key={i} className="stat-card" style={{ '--accent': stat.color }}>
            <div className="stat-icon" style={{ backgroundColor: `${stat.color}20`, color: stat.color }}>
              {stat.icon}
            </div>
            <div className="stat-info">
              <h3>{loading ? '...' : stat.value}</h3>
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
              {[30, 55, 45, 80, 65, 90, 100].map((h, idx) => (
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
            {statsData.recent_activities.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '24px 0' }}>
                Hozircha harakatlar yo'q
              </div>
            ) : (
              statsData.recent_activities.map((act, idx) => {
                const isApproved = act.status === 'approved';
                return (
                  <div className="list-item" key={idx}>
                    <div className={`activity-icon ${isApproved ? 'bg-green' : 'bg-purple'}`}>
                      {isApproved ? <UserCheck size={16} /> : <Users size={16} />}
                    </div>
                    <div className="activity-text">
                      <p className="activity-title">{act.title}</p>
                      <p className="activity-time">{formatTimeAgo(act.time)}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="chart-card glass-card">
          <h3>Tizim holati</h3>
          <div className="system-status">
            <div className="status-item">
              <span className="status-label">Server holati</span>
              <span className="status-value text-green">Meyorda (Faol)</span>
            </div>
            <div className="status-item">
              <span className="status-label">Faol marshrutlar</span>
              <span className="status-value">{statsData.total_routes} ta</span>
            </div>
            <div className="status-item">
              <span className="status-label">Kutilayotgan nomzodlar</span>
              <span className="status-value" style={{ color: statsData.pending_candidates > 0 ? '#f59e0b' : 'inherit' }}>
                {statsData.pending_candidates} ta
              </span>
            </div>
            <div className="status-item">
              <span className="status-label">Ma'lumotlar bazasi</span>
              <span className="status-value text-green">Ulangan</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
