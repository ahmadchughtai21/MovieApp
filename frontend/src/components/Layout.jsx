import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate, Link } from 'react-router-dom'
import { useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import SearchBar from './SearchBar'
import Icon from './Icon'

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/movies', label: 'Movies' },
  { to: '/shows', label: 'TV Shows' },
  { to: '/genres', label: 'Genres' }
]

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const { user, logout } = useAuth()

  const query = useMemo(() => {
    const params = new URLSearchParams(location.search)
    return params.get('q') || ''
  }, [location.search])

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  function handleSearch(value) {
    if (!value) return
    setMenuOpen(false)
    navigate(`/search?q=${encodeURIComponent(value)}`)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <NavLink to="/" className="brand" aria-label="Madflix home">
          <span className="brand-mark">M</span>
          <span className="brand-name">Madflix</span>
        </NavLink>

        <nav className="nav nav-desktop" aria-label="Primary">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="topbar-right">
          <div className="search-wrap search-desktop">
            <SearchBar initialValue={query} onSubmit={handleSearch} />
          </div>

          {user ? (
            <div className="user-menu-desktop">
              {user.is_admin && (
                <Link to="/admin" className="nav-link" title="Admin Dashboard">
                  <Icon name="grid" size={18} />
                </Link>
              )}
              <Link to="/watchlist" className="nav-link" title="My Watchlist">
                <Icon name="heart" size={18} />
              </Link>
              <Link to="/history" className="nav-link" title="Watch History">
                <Icon name="clock" size={18} />
              </Link>
              <div className="user-avatar-wrap" title={user.display_name || user.username}>
                <div className="user-avatar">
                  {(user.display_name || user.username || 'U')[0].toUpperCase()}
                </div>
              </div>
            </div>
          ) : (
            <div className="auth-buttons-desktop">
              <Link to="/login" className="btn btn-ghost" style={{ padding: '7px 14px', fontSize: '0.8rem' }}>Sign In</Link>
              <Link to="/register" className="btn btn-accent" style={{ padding: '7px 14px', fontSize: '0.8rem' }}>Sign Up</Link>
            </div>
          )}

          <button
            type="button"
            className="menu-toggle"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <Icon name={menuOpen ? 'x' : 'menu'} size={20} />
          </button>
        </div>
      </header>

      <div className={`mobile-panel${menuOpen ? ' open' : ''}`} aria-hidden={!menuOpen}>
        <div className="mobile-panel-inner">
          <div className="mobile-search">
            <SearchBar initialValue={query} onSubmit={handleSearch} placeholder="Search movies, shows…" />
          </div>
          <nav className="nav nav-mobile" aria-label="Mobile">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </NavLink>
            ))}
            {user ? (
              <>
                <NavLink to="/watchlist" className="nav-link" onClick={() => setMenuOpen(false)}>My Watchlist</NavLink>
                <NavLink to="/history" className="nav-link" onClick={() => setMenuOpen(false)}>Watch History</NavLink>
                {user.is_admin && (
                  <NavLink to="/admin" className="nav-link" onClick={() => setMenuOpen(false)}>Admin</NavLink>
                )}
                <button className="nav-link" style={{ width: '100%', textAlign: 'left' }} onClick={() => { logout(); setMenuOpen(false) }}>
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className="nav-link" onClick={() => setMenuOpen(false)}>Sign In</NavLink>
                <NavLink to="/register" className="nav-link" onClick={() => setMenuOpen(false)}>Sign Up</NavLink>
              </>
            )}
          </nav>
        </div>
      </div>

      {menuOpen ? <div className="mobile-backdrop" onClick={() => setMenuOpen(false)} /> : null}

      <main className="main">
        <Outlet />
      </main>

      <footer className="footer">
        <div className="footer-left">
          <span className="brand-mark" aria-hidden="true">M</span>
          <span className="brand-name">Madflix</span>
        </div>
        <div className="footer-meta">
          Data from <a href="https://www.themoviedb.org/" target="_blank" rel="noreferrer" className="footer-link">TMDB</a>.
        </div>
        <a
          href="https://github.com/ahmadchughtai21"
          target="_blank"
          rel="noreferrer"
          className="footer-credit"
        >
          Made with <span className="footer-heart" aria-hidden="true"><Icon name="heart" size={12} /></span> by Ahmad
        </a>
      </footer>
    </div>
  )
}
