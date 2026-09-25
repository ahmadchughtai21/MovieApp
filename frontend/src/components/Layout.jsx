import { useEffect, useState, useRef } from 'react'
import { NavLink, Outlet, useLocation, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTVNavigation } from '../hooks/useTVNavigation'
import Icon from './Icon'

const navItems = [
  { to: '/', label: 'Feed', icon: 'users' },
  { to: '/discover', label: 'Discover', icon: 'film' },
  { to: '/clips', label: 'Clips', icon: 'clapper' },
  { to: '/diary', label: 'Diary', icon: 'journal' },
  { to: '/watchlist', label: 'Watchlist', icon: 'heart' },
]

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const searchInputRef = useRef(null)
  const { user } = useAuth()
  const shellRef = useRef(null)
  useTVNavigation(shellRef)

  useEffect(() => { setSearchOpen(false); setSearchValue('') }, [location.pathname])

  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 40) }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' in window ? 'instant' : 'auto' })
  }, [location.pathname])

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
              {user.is_admin && (
                <NavLink to="/admin" className="fn-icon" title="Admin">
                  <Icon name="shield" size={16} />
                </NavLink>
              )}
              <NavLink
                to={`/user/${user.username}`}
                className="fn-avatar"
                title="My Profile"
                aria-label="My Profile"
              >
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="" width="16" height="16" style={{ borderRadius: '99px', objectFit: 'cover' }} />
                ) : (
                  <Icon name="user" size={16} />
                )}
              </NavLink>
            </>
          ) : (
            <Link to="/login" className="fn-login">Sign In</Link>
          )}
        </div>
      </nav>

      {/* Mobile top bar */}
      <header className={`topbar-mobile${scrolled ? ' scrolled' : ''}${searchOpen ? ' searching' : ''}`}>
        <NavLink to="/" className="brand" aria-label="Madflix home">
          <span className="brand-mark">M</span>
          <span className="brand-name">Madflix</span>
        </NavLink>
        <div className="topbar-mobile-right">
          <div className={`topbar-search${searchOpen ? ' open' : ''}`}>
            {searchOpen && (
              <form
                className="topbar-search-form"
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
                <button type="submit" className="topbar-search-submit">
                  <Icon name="search" size={14} />
                </button>
              </form>
            )}
            {!searchOpen && (
              <button
                className="topbar-icon-btn"
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
            )}
          </div>
          {!user && (
            <Link to="/login" className="btn btn--accent btn--sm">Sign In</Link>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="main-content">
        <div className="main-content-inner">
          <Outlet />
        </div>
        <footer className="footer">
          <div className="footer-inner">
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
          </div>
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
          <NavLink to={`/user/${user.username}`} className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}>
            <Icon name="user" size={18} />
            <span className="bottom-nav-label">Profile</span>
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