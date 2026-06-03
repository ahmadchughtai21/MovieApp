import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useMemo } from 'react'
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
