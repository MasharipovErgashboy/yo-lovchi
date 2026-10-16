
export default function Header({ assignedRoute }) {
  return (
    <div className="header-container flex justify-between items-center">
      <div>
        <h1 className="header-title">Joylashuv</h1>
        <div className="header-status">
          <div 
            className="status-dot" 
            style={{ backgroundColor: assignedRoute ? 'var(--green)' : '#94a3b8' }}
          ></div>
          {assignedRoute ? `${assignedRoute.number}-marshrut • Haydovchi` : "Marshrut biriktirilmagan"}
        </div>
      </div>
    </div>
  )
}
