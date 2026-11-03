import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Icon from '../components/Icon'
import { api } from '../lib/api'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    username: '', email: '', password: '', password2: '', display_name: '',
    age: '', location_city: '', location_country: 'Pakistan',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [cityQuery, setCityQuery] = useState('')
  const [cityResults, setCityResults] = useState([])
  const [cityLoading, setCityLoading] = useState(false)
  const [cityFocused, setCityFocused] = useState(false)
  const [selectedCity, setSelectedCity] = useState(null)
  const cityTimer = useRef(null)

  useEffect(() => {
    const query = cityQuery.trim()
    if (query.length < 2 || selectedCity) {
      return undefined
    }
    cityTimer.current = setTimeout(() => {
      setCityLoading(true)
      api.searchCities(query)
        .then((data) => setCityResults(Array.isArray(data) ? data : []))
        .catch(() => setCityResults([]))
        .finally(() => setCityLoading(false))
    }, 300)
    return () => clearTimeout(cityTimer.current)
  }, [cityQuery, selectedCity])

  function chooseCity(item) {
    setSelectedCity(item)
    setCityQuery(`${item.city}, ${item.country}`)
    setForm((prev) => ({
      ...prev,
      location_city: item.city,
      location_country: item.country,
    }))
    setCityResults([])
    setCityFocused(false)
  }

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
    if (!form.age || Number(form.age) < 13) {
      setError('You must be at least 13 years old to join.')
      return
    }
    if (!selectedCity || !form.location_city) {
      setError('Please select your city from the suggestions.')
      return
    }
    setLoading(true)
    try {
      await register(
        form.username,
        form.password,
        form.password2,
        form.display_name || form.username,
        form.email,
        Number(form.age),
        form.location_city.trim(),
        form.location_country.trim() || 'Pakistan',
      )
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
            <span>Age</span>
            <input
              type="number"
              className="auth-input"
              placeholder="You must be 13 or older"
              value={form.age}
              onChange={(e) => update('age', e.target.value)}
              required
              min={13}
              max={120}
              inputMode="numeric"
            />
          </label>

          <label className="auth-label auth-city">
              <span>City</span>
              <input
                type="text"
                className="auth-input"
                placeholder="Search your city"
                value={cityQuery}
                onChange={(e) => {
                  const value = e.target.value
                  setCityQuery(value)
                  setSelectedCity(null)
                  if (value.trim().length < 2) setCityResults([])
                  setForm((prev) => ({ ...prev, location_city: '' }))
                }}
                onFocus={() => setCityFocused(true)}
                onBlur={() => setTimeout(() => setCityFocused(false), 120)}
                required
                maxLength={100}
                autoComplete="off"
              />
              {cityFocused && (cityLoading || cityResults.length > 0) && (
                <div className="auth-city__menu">
                  {cityLoading && <span className="auth-city__empty">Searching…</span>}
                  {!cityLoading && cityResults.length === 0 && (
                    <span className="auth-city__empty">No cities found.</span>
                  )}
                  {cityResults.map((item) => (
                    <button
                      key={`${item.city}-${item.country}`}
                      type="button"
                      className="auth-city__item"
                      onMouseDown={(event) => {
                        event.preventDefault()
                        chooseCity(item)
                      }}
                    >
                      <span>{item.city}</span>
                      <em>{item.country}</em>
                    </button>
                  ))}
                </div>
              )}
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
