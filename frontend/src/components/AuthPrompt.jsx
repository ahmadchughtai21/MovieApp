import { Link } from 'react-router-dom'
import { createPortal } from 'react-dom'
import Icon from './Icon'

export default function AuthPrompt({ open, onClose }) {
  if (!open) return null

  return createPortal(
    <div className="auth-backdrop" onClick={onClose}>
      <div className="auth-modal" onClick={e => e.stopPropagation()}>
        <button className="auth-modal-close" onClick={onClose} aria-label="Close">
          <Icon name="x" size={18} />
        </button>
        <div className="auth-modal-icon">
          <Icon name="lock" size={32} />
        </div>
        <h3>Sign in required</h3>
        <p>You need an account to use this feature.</p>
        <div className="auth-modal-actions">
          <Link to="/login" className="btn btn-primary" onClick={onClose}>
            Sign In
          </Link>
          <Link to="/register" className="btn btn-ghost" onClick={onClose}>
            Sign Up
          </Link>
        </div>
      </div>
    </div>,
    document.body
  )
}
