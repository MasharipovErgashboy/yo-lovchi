import { Flag } from 'lucide-react'

export default function Header() {
  return (
    <div className="header-container flex justify-between items-center">
      <div>
        <h1 className="header-title">Joylashuv</h1>
        <div className="header-status">
          <div className="status-dot"></div>
          Haydovchi rejimi
        </div>
      </div>
      <button className="btn-danger-light-small">
        <Flag size={16} fill="currentColor" />
        Oxirgi reys
      </button>
    </div>
  )
}
