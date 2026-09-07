import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const AuthContext = createContext(null)

const API = import.meta.env.VITE_API_BASE || '/api'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('madflix_token')
    if (!token) { setLoading(false); return }
    fetch(`${API}/auth/me/`, { headers: { Authorization: `Token ${token}` } })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data) => setUser({ ...data, is_admin: data.is_staff }))
      .catch(() => localStorage.removeItem('madflix_token'))
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (username, password) => {
    const res = await fetch(`${API}/auth/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Login failed')
    localStorage.setItem('madflix_token', data.token)
    setUser({ ...data.user, is_admin: data.user.is_staff })
  }, [])

  const register = useCallback(async (username, password, password2, display_name, email) => {
    const res = await fetch(`${API}/auth/register/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, password2, display_name, email }),
    })
    const data = await res.json()
    if (!res.ok) {
      const msg = typeof data === 'object' ? Object.values(data).flat().join(', ') : 'Registration failed'
      throw new Error(msg)
    }
    localStorage.setItem('madflix_token', data.token)
    setUser({ ...data.user, is_admin: data.user.is_staff })
  }, [])

  const logout = useCallback(async () => {
    const token = localStorage.getItem('madflix_token')
    if (token) {
      fetch(`${API}/auth/logout/`, { method: 'POST', headers: { Authorization: `Token ${token}` } }).catch(() => {})
    }
    localStorage.removeItem('madflix_token')
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
