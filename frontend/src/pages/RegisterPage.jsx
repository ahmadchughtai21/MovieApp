import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Icon from '../components/Icon'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', email: '', password: '', password2: '', display_name: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (form.password !== form.password2) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      await register(form.username, form.password, form.password2, form.display_name || form.username, form.email)
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-panel">
        <div className="auth-brand">
          <Link to="/" className="brand" aria-label="Madflix home">
            <span className="brand-mark brand-mark-lg">M</span>
          </Link>
          <h1 className="auth-title">Create account</h1>
          <p className="auth-sub">Join Madflix to track your watchlist</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && (
            <div className="auth-error">
              <Icon name="x" size={14} />
              {error}
            </div>
          )}

          <label className="auth-label">
            <span>Username</span>
            <input
              type="text"
              className="auth-input"
              placeholder="Choose a username"
              value={form.username}
              onChange={(e) => update('username', e.target.value)}
              required
              autoFocus
              minLength={3}
              autoComplete="username"
            />
          </label>

          <label className="auth-label">
            <span>Display Name</span>
            <input
              type="text"
              className="auth-input"
              placeholder="How should we call you?"
              value={form.display_name}
              onChange={(e) => update('display_name', e.target.value)}
              autoComplete="name"
            />
          </label>

          <label className="auth-label">
            <span>Email</span>
            <input
              type="email"
              className="auth-input"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              required
              autoComplete="email"
            />
          </label>

          <label className="auth-label">
            <span>Password</span>
            <input
              type="password"
              className="auth-input"
              placeholder="Min 6 characters"
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </label>

          <label className="auth-label">
            <span>Confirm Password</span>
            <input
              type="password"
              className="auth-input"
              placeholder="Re-enter your password"
              value={form.password2}
              onChange={(e) => update('password2', e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </label>

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? (
              <span className="auth-submit-loading">
                <span className="spinner"></span>
                Creating account...
              </span>
            ) : 'Create Account'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account?{' '}
          <Link to="/login" className="auth-link">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
