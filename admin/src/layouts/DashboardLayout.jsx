import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Car, 
  MapPin, 
  MessageSquare,
  LogOut,
  Headphones,
  Menu,
  X
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const currentNav = navItems.find(item => item.path === location.pathname) || navItems[0];

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogoutClick = () => {
    setIsMobileMenuOpen(false);
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
      {/* Mobile Drawer Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="sidebar-backdrop" 
          onClick={() => setIsMobileMenuOpen(false)} 
        />
      )}

      {/* Sidebar (Desktop fixed / Mobile sliding drawer) */}
      <aside className={`sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-icon">Y</div>
          <h2>Yo'lovchi</h2>
          <button 
            type="button"
            className="sidebar-close-btn" 
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Menyuni yopish"
          >
            <X size={20} />
          </button>
        </div>
        
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink 
              key={item.path} 
              to={item.path} 
              className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}
              end={item.path === '/'}
              onClick={() => setIsMobileMenuOpen(false)}
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
          <div className="topbar-left">
            <button 
              type="button"
              className="mobile-menu-btn" 
              onClick={() => setIsMobileMenuOpen(prev => !prev)}
              aria-label="Menyuni ochish"
            >
              <Menu size={22} />
            </button>
            <div className="topbar-title">
              <h1>{currentNav.label}</h1>
            </div>
          </div>

          <div className="topbar-right">
            <div className="user-profile-compact">
              <div className="avatar-compact">A</div>
              <span className="user-name-compact">Admin</span>
            </div>
          </div>
        </header>

        <div className="content-area">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
