import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Car, 
  MapPin, 
  MessageSquare,
  LogOut,
  Bell,
  Headphones
} from 'lucide-react';
import './DashboardLayout.css';

const navItems = [
  { path: '/', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { path: '/candidates', label: 'Haydovchi nomzodlari', icon: <Users size={20} /> },
  { path: '/drivers', label: 'Haydovchilar', icon: <Car size={20} /> },
  { path: '/routes', label: 'Marshrutlar', icon: <MapPin size={20} /> },
  { path: '/messages', label: 'Xabarlar', icon: <MessageSquare size={20} /> },
  { path: '/support', label: 'Qo\'llab-quvvatlash', icon: <Headphones size={20} /> },
];

export default function DashboardLayout({ onLogout }) {
  const location = useLocation();
  const currentNav = navItems.find(item => item.path === location.pathname) || navItems[0];

  const handleLogoutClick = () => {
    if (onLogout) {
      onLogout();
    } else {
      localStorage.removeItem('yolovchi_admin_logged_in');
      localStorage.removeItem('yolovchi_admin_user');
      window.location.href = '/login';
    }
  };

  return (
    <div className="layout-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">Y</div>
          <h2>Yo'lovchi</h2>
        </div>
        
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink 
              key={item.path} 
              to={item.path} 
              className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}
              end={item.path === '/'}
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogoutClick}>
            <LogOut size={20} />
            <span>Tizimdan chiqish</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <header className="topbar">
          <div className="topbar-title">
            <h1>{currentNav.label}</h1>
          </div>
          
          <div className="topbar-actions">
            <button className="icon-btn">
              <Bell size={20} />
              <span className="badge"></span>
            </button>
            <div className="user-profile">
              <div className="avatar">A</div>
              <div className="user-info">
                <span className="user-name">Admin</span>
                <span className="user-role">Superuser</span>
              </div>
            </div>
          </div>
        </header>

        <div className="content-area">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
