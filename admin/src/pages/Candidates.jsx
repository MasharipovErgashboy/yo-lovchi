import React, { useState } from 'react';
import { Eye, Check, X, Phone, User } from 'lucide-react';
import './PagesCommon.css';

export default function Candidates() {
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  const candidates = [
    { id: 1, name: 'Ergashboy Masharipov', phone: '+998 90 027 50 66', status: 'Yangi', date: 'Bugun, 14:30' },
    { id: 2, name: 'Sardor Qodirov', phone: '+998 93 123 45 67', status: 'Yangi', date: 'Kecha, 09:15' },
    { id: 3, name: 'Jamshid Aliyev', phone: '+998 97 765 43 21', status: 'Yangi', date: 'Kecha, 18:40' },
  ];

  return (
    <div className="page-container">
      <div className="glass-card full-height">
        <div className="card-header">
          <h2>Nomzodlar</h2>
          <span className="badge-count">{candidates.length} ta yangi</span>
        </div>

        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>F.I.O</th>
                <th>Telefon raqam</th>
                <th>Status</th>
                <th>Sana</th>
                <th>Amal</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map(cand => (
                <tr key={cand.id}>
                  <td>
                    <div className="td-user">
                      <div className="td-avatar"><User size={16} /></div>
                      {cand.name}
                    </div>
                  </td>
                  <td>{cand.phone}</td>
                  <td><span className="status-badge new">{cand.status}</span></td>
                  <td>{cand.date}</td>
                  <td>
                    <button 
                      className="action-btn view"
                      onClick={() => setSelectedCandidate(cand)}
                      title="Ko'rish"
                    >
                      <Eye size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {selectedCandidate && (
        <div className="modal-overlay" onClick={() => setSelectedCandidate(null)}>
          <div className="modal-content glass-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Nomzod ma'lumotlari</h3>
              <button className="close-btn" onClick={() => setSelectedCandidate(null)}><X size={24} /></button>
            </div>
            <div className="modal-body">
              <div className="cand-profile">
                <div className="cand-avatar large"><User size={40} /></div>
                <h2>{selectedCandidate.name}</h2>
                <div className="cand-phone">
                  <Phone size={16} /> {selectedCandidate.phone}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-reject" onClick={() => setSelectedCandidate(null)}>
                <X size={20} /> Rad etish
              </button>
              <button className="btn-approve" onClick={() => setSelectedCandidate(null)}>
                <Check size={20} /> Tasdiqlash
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
