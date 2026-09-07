import { Link } from 'react-router-dom'
import Icon from './Icon'

export default function AuthPrompt({ open, onClose }) {
  if (!open) return null
  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div className="admin-modal" onClick={e => e.stopPropagation()}>
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <Icon name="lock" size={36} style={{ color: '#f5b942', opacity: 0.8 }} />
        </div>
        <h3 style={{ textAlign: 'center' }}>Sign in required</h3>
        <p style={{ color: '#94a3b8', fontSize: '0.88rem', textAlign: 'center', margin: '8px 0 24px' }}>
          You need an account to use this feature.
        </p>
        <div className="admin-modal-actions" style={{ justifyContent: 'center', gap: '12px' }}>
          <Link to="/login" className="btn btn-accent" onClick={onClose} style={{ minWidth: '120px', textAlign: 'center' }}>
            Sign In
          </Link>
          <Link to="/register" className="btn btn-ghost" onClick={onClose} style={{ minWidth: '120px', textAlign: 'center' }}>
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  )
}
