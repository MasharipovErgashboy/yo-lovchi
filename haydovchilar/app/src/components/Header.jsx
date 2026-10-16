
import React from 'react';
import { Volume2, X } from 'lucide-react';

export default function Header({ assignedRoute, playingStopAnnouncement, onStopAnnouncement }) {
  return (
    <div className="header-container flex justify-between items-center">
      <div className="header-left">
        <h1 className="header-title">Joylashuv</h1>
        <div className="header-status">
          <div 
            className="status-dot" 
            style={{ backgroundColor: assignedRoute ? 'var(--green)' : '#94a3b8' }}
          ></div>
          {assignedRoute ? `${assignedRoute.number}-marshrut • Haydovchi` : "Marshrut biriktirilmagan"}
        </div>
      </div>

      {playingStopAnnouncement && (
        <div className="header-stop-announcement-card">
          <div className="announcement-pulse-icon">
            <Volume2 size={15} color="#ffffff" />
          </div>
          <div className="announcement-content">
            <span className="announcement-tag">Bekat e'loni</span>
            <span className="announcement-stop-name" title={playingStopAnnouncement.name}>
              {playingStopAnnouncement.name}
            </span>
          </div>
          {onStopAnnouncement && (
            <button 
              type="button" 
              className="announcement-close-btn"
              onClick={onStopAnnouncement}
              title="To'xtatish"
            >
              <X size={12} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
