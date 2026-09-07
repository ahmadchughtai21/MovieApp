import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

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
      <div className="auth-card">
        <div className="auth-header">
          <Link to="/" className="brand" aria-label="Madflix home">
            <span className="brand-mark">M</span>
          </Link>
          <h1 className="auth-title">Create account</h1>
          <p className="auth-sub">Join Madflix to track your watchlist</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && <div className="auth-error">{error}</div>}

          <label className="auth-label">
            Username
            <input
              type="text"
              className="auth-input"
              value={form.username}
              onChange={(e) => update('username', e.target.value)}
              required
              autoFocus
              minLength={3}
              autoComplete="username"
            />
          </label>

          <label className="auth-label">
            Display Name
            <input
              type="text"
              className="auth-input"
              value={form.display_name}
              onChange={(e) => update('display_name', e.target.value)}
              placeholder={form.username || 'How should we call you?'}
              autoComplete="name"
            />
          </label>

          <label className="auth-label">
            Email
            <input
              type="email"
              className="auth-input"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              placeholder="Optional"
              autoComplete="email"
            />
          </label>

          <label className="auth-label">
            Password
            <input
              type="password"
              className="auth-input"
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </label>

          <label className="auth-label">
            Confirm Password
            <input
              type="password"
              className="auth-input"
              value={form.password2}
              onChange={(e) => update('password2', e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </label>

          <button type="submit" className="btn btn-accent auth-submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="auth-footer-text">
          Already have an account?{' '}
          <Link to="/login" className="auth-link">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
