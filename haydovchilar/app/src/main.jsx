import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("App Error Boundary caught:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background: '#0f172a',
          color: '#fff',
          textAlign: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>Ilovani yuklashda xatolik</h2>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '20px', lineHeight: '1.5' }}>
            Qayta urinib ko'rish uchun quyidagi tugmani bosing.
          </p>
          <button 
            onClick={() => window.location.reload()} 
            style={{
              padding: '12px 24px',
              background: '#0284c7',
              color: '#fff',
              borderRadius: '12px',
              border: 'none',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Qayta yuklash
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

