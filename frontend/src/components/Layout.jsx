import { useEffect, useState, useRef } from 'react'
import { NavLink, Outlet, useLocation, useNavigate, Link } from 'react-router-dom'
import { useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTVNavigation } from '../hooks/useTVNavigation'
import SearchBar from './SearchBar'
import Icon from './Icon'

const navItems = [
  { to: '/', label: 'Home', icon: 'home' },
  { to: '/movies', label: 'Movies', icon: 'film' },
  { to: '/shows', label: 'TV Shows', icon: 'tv' },
  { to: '/genres', label: 'Genres', icon: 'grid' },
]

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const searchInputRef = useRef(null)
  const { user, logout } = useAuth()
  const shellRef = useRef(null)
  useTVNavigation(shellRef)

  const query = useMemo(() => {
    const params = new URLSearchParams(location.search)
    return params.get('q') || ''
  }, [location.search])

  useEffect(() => { setMenuOpen(false); setSearchOpen(false); setSearchValue('') }, [location.pathname])

  useEffect(() => {
    const el = document.querySelector('.main-content')
    if (!el) return
    function onScroll() { setScrolled(el.scrollTop > 40) }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  function handleSearch(value) {
    if (!value) return
    setMenuOpen(false)
    navigate(`/search?q=${encodeURIComponent(value)}`)
  }

  return (
    <div className="app-shell" ref={shellRef}>
      {/* Floating navbar */}
      <nav className={`floating-nav${scrolled ? ' scrolled' : ''}`}>
        <NavLink to="/" className="fn-brand" aria-label="Madflix home">
          <span className="fn-brand-mark">M</span>
        </NavLink>

        <div className="fn-links">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `fn-link${isActive ? ' active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </div>

        <div className="fn-right">
          <div className={`fn-search${searchOpen ? ' open' : ''}`}>
            {searchOpen && (
              <form
                className="fn-search-form"
                onSubmit={(e) => {
                  e.preventDefault()
                  const q = searchValue.trim()
                  if (q) {
                    navigate(`/search?q=${encodeURIComponent(q)}`)
                    setSearchOpen(false)
                    setSearchValue('')
                  }
                }}
              >
                <input
                  ref={searchInputRef}
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder="Search..."
                  aria-label="Search"
                  type="search"
                  autoFocus
                />
                <button type="submit" className="fn-search-submit">
                  <Icon name="search" size={14} />
                </button>
              </form>
            )}
            <button
              className="fn-icon"
              title="Search"
              onClick={() => {
                setSearchOpen((v) => !v)
                if (!searchOpen) {
                  setTimeout(() => searchInputRef.current?.focus(), 100)
                }
              }}
            >
              <Icon name="search" size={16} />
            </button>
          </div>
          {user ? (
            <>
              <NavLink to="/watchlist" className="fn-icon" title="Saved">
                <Icon name="heart" size={16} />
              </NavLink>
              {user.is_admin && (
                <NavLink to="/admin" className="fn-icon" title="Admin">
                  <Icon name="shield" size={16} />
                </NavLink>
              )}
              <div className="fn-avatar-wrap">
                <div className="fn-avatar">
                  <Icon name="user" size={16} />
                </div>
                <div className="fn-avatar-dropdown">
                  <span className="fn-avatar-name">{user.username}</span>
                  <button className="fn-avatar-logout" onClick={logout}>
                    <Icon name="logOut" size={14} />
                    Sign Out
                  </button>
                </div>
              </div>
            </>
          ) : (
            <Link to="/login" className="fn-login">Sign In</Link>
          )}
        </div>
      </nav>

      {/* Mobile top bar */}
      <header className="topbar-mobile">
        <NavLink to="/" className="brand" aria-label="Madflix home">
          <span className="brand-mark">M</span>
          <span className="brand-name">Madflix</span>
        </NavLink>
        <div className="topbar-mobile-right">
          <button
            type="button"
            className="menu-toggle"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <Icon name={menuOpen ? 'x' : 'menu'} size={18} />
          </button>
        </div>
      </header>

      {/* Mobile slide panel */}
      {menuOpen && <div className="mobile-backdrop" onClick={() => setMenuOpen(false)} />}
      <div className={`mobile-panel${menuOpen ? ' open' : ''}`}>
        <div className="mobile-panel-inner">
          <div className="mobile-panel-header">
            <span className="brand-mark">M</span>
            <span className="brand-name">Madflix</span>
            <button className="mobile-panel-close" onClick={() => setMenuOpen(false)} aria-label="Close menu">
              <Icon name="x" size={20} />
            </button>
          </div>
          <div className="mobile-search">
            <SearchBar initialValue={query} onSubmit={handleSearch} placeholder="Search..." />
          </div>
          <nav className="nav-mobile">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => `mobile-link${isActive ? ' active' : ''}`}
                onClick={() => setMenuOpen(false)}
              >
                <Icon name={item.icon} size={16} />
                {item.label}
              </NavLink>
            ))}
            {user ? (
              <>
                <NavLink to="/watchlist" className="mobile-link" onClick={() => setMenuOpen(false)}>
                  <Icon name="heart" size={16} /> Saved
                </NavLink>
                {user.is_admin && (
                  <NavLink to="/admin" className="mobile-link" onClick={() => setMenuOpen(false)}>
                    <Icon name="shield" size={16} /> Admin
                  </NavLink>
                )}
                <button className="mobile-link" onClick={() => { logout(); setMenuOpen(false) }}>
                  <Icon name="logOut" size={16} /> Sign Out
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className="mobile-link" onClick={() => setMenuOpen(false)}>
                  <Icon name="user" size={16} /> Sign In
                </NavLink>
                <NavLink to="/register" className="mobile-link" onClick={() => setMenuOpen(false)}>
                  <Icon name="plus" size={16} /> Sign Up
                </NavLink>
              </>
            )}
          </nav>
        </div>
      </div>

      {/* Main content */}
      <main className="main-content">
        <div className="main-content-inner">
          <Outlet />
        </div>
        <footer className="footer">
          <div className="footer-left">
            <span className="brand-mark" aria-hidden="true">M</span>
            <span className="brand-name">Madflix</span>
          </div>
          <div className="footer-meta">
            Data from <a href="https://www.themoviedb.org/" target="_blank" rel="noreferrer" className="footer-link">TMDB</a>
          </div>
          <a href="https://github.com/ahmadchughtai21" target="_blank" rel="noreferrer" className="footer-credit">
            Made with <span className="footer-heart"><Icon name="heart" size={10} /></span> by Ahmad
          </a>
        </footer>
      </main>

      {/* Mobile bottom nav */}
      <nav className="bottom-nav" aria-label="Bottom navigation">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}
          >
            <Icon name={item.icon} size={18} />
            <span className="bottom-nav-label">{item.label}</span>
          </NavLink>
        ))}
        {user ? (
          <NavLink to="/watchlist" className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}>
            <Icon name="heart" size={18} />
            <span className="bottom-nav-label">Saved</span>
          </NavLink>
        ) : (
          <NavLink to="/login" className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}>
            <Icon name="user" size={18} />
            <span className="bottom-nav-label">Sign In</span>
          </NavLink>
        )}
      </nav>
    </div>
  )
}