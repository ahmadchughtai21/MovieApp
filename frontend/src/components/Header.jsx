import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'
import Icon from './Icon'
import FoundingBadge from './FoundingBadge'
import VipBadge from './VipBadge'

function timeAgo(value) {
  const then = new Date(value).getTime()
  if (Number.isNaN(then)) return ''
  const seconds = Math.max(1, Math.floor((Date.now() - then) / 1000))
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(value).toLocaleDateString()
}

const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/swipe', label: 'CineSwipe' },
  { to: '/clips', label: 'Clips' },
  { to: '/communities', label: 'Communities' },
  { to: '/messages', label: 'Messages' },
]

function SearchControl({ variant = 'desktop', open, onOpenChange }) {
  const [value, setValue] = useState('')
  const inputRef = useRef(null)
  const navigate = useNavigate()
  const isMobile = variant === 'mobile'

  function toggle() {
    onOpenChange(!open)
    if (!open) {
      setTimeout(() => inputRef.current?.focus(), 80)
    }
  }

  function submit(event) {
    event.preventDefault()
    const query = value.trim()
    if (!query) return
    navigate(`/search?q=${encodeURIComponent(query)}`)
    setValue('')
    onOpenChange(false)
  }

  return (
    <div className={isMobile ? `topbar-search${open ? ' open' : ''}` : `fn-search${open ? ' open' : ''}`}>
      {open && (
        <form className={isMobile ? 'topbar-search-form' : 'fn-search-form'} onSubmit={submit}>
          <input
            ref={inputRef}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Search titles, people, communities..."
            aria-label="Search"
            type="search"
            autoFocus
          />
          <button type="submit" className={isMobile ? 'topbar-search-submit' : 'fn-search-submit'}>
            <Icon name="search" size={14} />
          </button>
        </form>
      )}
      <button
        type="button"
        className={isMobile ? 'topbar-icon-btn' : 'fn-icon'}
        title={open ? 'Close search' : 'Search'}
        aria-label={open ? 'Close search' : 'Search'}
        onClick={toggle}
      >
        <Icon name={open && isMobile ? 'x' : 'search'} size={16} />
      </button>
    </div>
  )
}

function ProfileMenu({ variant = 'desktop' }) {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)
  const isMobile = variant === 'mobile'

  useEffect(() => {
    if (!open) return undefined
    function onPointerDown(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) setOpen(false)
    }
    function onKeyDown(event) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  if (!user) {
    return isMobile
      ? <Link to="/login" className="btn btn--accent btn--sm">Sign In</Link>
      : <Link to="/login" className="fn-login">Sign In</Link>
  }

  const accent = user.profile_accent_color || '#f5b942'
  const initial = (user.display_name || user.username || '?').charAt(0).toUpperCase()

  return (
    <div className="fn-profile" ref={menuRef}>
      <button
        type="button"
        className={`fn-avatar${open ? ' open' : ''}`}
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        title="My Profile"
        aria-label="My Profile"
        style={{ borderColor: accent }}
      >
        {user.avatar_url ? (
          <img src={user.avatar_url} alt="" />
        ) : (
          <span className="fn-avatar-initial" style={{ color: accent }}>{initial}</span>
        )}
      </button>

      {open && (
        <div className={`fn-menu${isMobile ? ' fn-menu--mobile' : ''}`} role="menu">
          <Link to="/profile" className="fn-menu-item" role="menuitem" onClick={() => setOpen(false)}>
            <Icon name="user" size={15} />
            My Profile
          </Link>
          <Link to="/watchlist" className="fn-menu-item" role="menuitem" onClick={() => setOpen(false)}>
            <Icon name="bookmark" size={15} />
            Watchlist
          </Link>
          <Link to="/history" className="fn-menu-item" role="menuitem" onClick={() => setOpen(false)}>
            <Icon name="clock" size={15} />
            History
          </Link>
          <div className="fn-menu-divider" />
          <Link to="/settings" className="fn-menu-item" role="menuitem" onClick={() => setOpen(false)}>
            <Icon name="info" size={15} />
            Settings
          </Link>
          <button
            type="button"
            className="fn-menu-item fn-menu-item--danger"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              logout()
            }}
          >
            <Icon name="logOut" size={15} />
            Logout
          </button>
        </div>
      )}
    </div>
  )
}

export default function Header({ scrolled = false }) {
  const { user } = useAuth()
  const [searchOpen, setSearchOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!user) return undefined
    let active = true
    const key = `madflix_notifs_seen_${user.id}`
    api.notifications()
      .then((data) => {
        if (!active) return
        const results = Array.isArray(data?.results) ? data.results : []
        const seen = Number(localStorage.getItem(key) || 0)
        setNotifications(results)
        setUnreadCount(results.filter((item) => new Date(item.created_at).getTime() > seen).length)
      })
      .catch(() => {})
    return () => { active = false }
  }, [user])

  async function openNotifications() {
    setNotificationsOpen(true)
    if (user) {
      localStorage.setItem(`madflix_notifs_seen_${user.id}`, String(Date.now()))
      setUnreadCount(0)
    }
    if (!user) return
    try {
      const data = await api.notifications()
      setNotifications(Array.isArray(data?.results) ? data.results : [])
    } catch {
      // keep the last loaded list
    }
  }

  async function respondFriendRequest(item, accept) {
    try {
      if (accept) await api.acceptFriendRequest(item.request_id)
      else await api.declineFriendRequest(item.request_id)
      setNotifications((prev) => prev.filter((entry) => entry.id !== item.id))
    } catch {
      // keep the request visible on failure
    }
  }

  return (
    <>
      <nav className={`floating-nav${scrolled ? ' scrolled' : ''}`}>
        <NavLink to="/" className="fn-brand" aria-label="Madflix home">
          <span className="fn-brand-mark">M</span>
        </NavLink>

        <div className="fn-links">
          {NAV_LINKS.map((item) => (
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
          <SearchControl open={searchOpen} onOpenChange={setSearchOpen} />
          <button
            type="button"
            className="fn-icon nav-bell"
            title="Notifications"
            aria-label="Notifications"
            onClick={openNotifications}
          >
            <Icon name="bell" size={16} />
            {unreadCount > 0 && <span className="nav-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
          </button>
          <ProfileMenu />
        </div>
      </nav>

      <header className={`topbar-mobile${scrolled ? ' scrolled' : ''}${searchOpen ? ' searching' : ''}`}>
        <NavLink to="/" className="brand" aria-label="Madflix home">
          <span className="brand-mark">M</span>
          <span className="brand-name">Madflix</span>
        </NavLink>
        <div className="topbar-mobile-right">
          <SearchControl variant="mobile" open={searchOpen} onOpenChange={setSearchOpen} />
          <button
            type="button"
            className="topbar-icon-btn topbar-bell nav-bell"
            title="Notifications"
            aria-label="Notifications"
            onClick={openNotifications}
          >
            <Icon name="bell" size={16} />
            {unreadCount > 0 && <span className="nav-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
          </button>
          <ProfileMenu variant="mobile" />
        </div>
      </header>

      {notificationsOpen && (
        <>
          <div className="notif-backdrop" onClick={() => setNotificationsOpen(false)} />
          <aside className="notif-drawer" role="dialog" aria-modal="true" aria-label="Notifications">
            <div className="notif-head">
              <h2>Notifications</h2>
              <button
                type="button"
                className="notif-close"
                onClick={() => setNotificationsOpen(false)}
                aria-label="Close notifications"
              >
                ×
              </button>
            </div>
            {notifications.length === 0 ? (
              <div className="notif-empty">
                <span className="notif-empty-icon"><Icon name="bell" size={22} /></span>
                <p>You're all caught up.</p>
                <span>New follows, likes, and replies will show up here.</span>
              </div>
            ) : (
              <div className="notif-list">
                {notifications.map((item) => {
                  const avatar = item.actor?.avatar_url ? (
                    <img className="notif-avatar" src={item.actor.avatar_url} alt="" />
                  ) : (
                    <span className="notif-avatar notif-avatar--initial">
                      {(item.actor?.display_name || item.actor?.username || '?').charAt(0).toUpperCase()}
                    </span>
                  )

                  if (item.type === 'friend_request') {
                    return (
                      <div key={item.id} className="notif-item notif-item--request">
                        {avatar}
                        <span className="notif-text">
                          <strong>
                            {item.actor?.display_name || item.actor?.username}
                            {item.actor?.is_founding_member && <FoundingBadge size={10} />}
                        {item.actor?.is_vip && <VipBadge size={9} />}
                          </strong>{' '}
                          {item.message}
                        </span>
                        <span className="notif-actions">
                          <button
                            type="button"
                            className="btn btn--accent btn--sm"
                            onClick={() => respondFriendRequest(item, true)}
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn--sm"
                            onClick={() => respondFriendRequest(item, false)}
                          >
                            Decline
                          </button>
                        </span>
                      </div>
                    )
                  }

                  return (
                    <Link
                      key={item.id}
                      to={item.link}
                      className="notif-item"
                      onClick={() => setNotificationsOpen(false)}
                    >
                      {avatar}
                      <span className="notif-text">
                        <strong>
                          {item.actor?.display_name || item.actor?.username}
                          {item.actor?.is_founding_member && <FoundingBadge size={10} />}
                        {item.actor?.is_vip && <VipBadge size={9} />}
                        </strong>{' '}
                        {item.message}
                      </span>
                      <span className="notif-time">{timeAgo(item.created_at)}</span>
                    </Link>
                  )
                })}
              </div>
            )}
          </aside>
        </>
      )}
    </>
  )
}
