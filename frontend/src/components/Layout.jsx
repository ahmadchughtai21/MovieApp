import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useMemo } from 'react'
import SearchBar from './SearchBar'

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/movies', label: 'Movies' },
  { to: '/shows', label: 'Shows' },
  { to: '/genres', label: 'Genres' },
  { to: '/search', label: 'Search' }
]

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()

  const query = useMemo(() => {
    const params = new URLSearchParams(location.search)
    return params.get('q') || ''
  }, [location.search])

  function handleSearch(value) {
    if (!value) return
    navigate(`/search?q=${encodeURIComponent(value)}`)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <NavLink to="/" className="brand">MadFlix</NavLink>
          <span className="brand-tag">Stream smarter</span>
        </div>
        <nav className="nav">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) =>
              `nav-link${isActive ? ' active' : ''}`
            }>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <SearchBar initialValue={query} onSubmit={handleSearch} />
      </header>

      <main className="main">
        <Outlet />
      </main>

      <footer className="footer">
        <div className="footer-brand">MadFlix</div>
        <div className="footer-meta">
          Powered by TMDB via the MadFlix API. Updated live with streaming data.
        </div>
        <div className="footer-links">
          <a href="http://127.0.0.1:8000/api/" target="_blank" rel="noreferrer">API Index</a>
          <a href="http://127.0.0.1:8000/api-docs/" target="_blank" rel="noreferrer">API Docs</a>
          <a href="https://github.com/ahmadchughtai21" target="_blank" rel="noreferrer">Made by Ahmad Chughtai</a>
        </div>
      </footer>
    </div>
  )
}
