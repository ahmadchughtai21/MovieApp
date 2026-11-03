import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import Icon from '../components/Icon'

const LINKS = [
  { to: '/profile', label: 'Edit profile', description: 'Bio, city, favourites, accent colour' },
  { to: '/watchlist', label: 'Watchlist', description: 'Titles you saved' },
  { to: '/history', label: 'History', description: 'Recently played' },
  { to: '/clips', label: 'Clips', description: 'Your shared moments' },
]

export default function SettingsPage() {
  useDocumentTitle('Settings')
  const { user, logout } = useAuth()

  return (
    <div className="page settings-page" style={{ maxWidth: 720, margin: '0 auto', width: '100%' }}>
      <div className="page-head">
        <h1>Settings</h1>
        <p className="page-sub">Account, shortcuts, and app information.</p>
      </div>

      {user && (
        <section style={{ display: 'grid', gap: 10 }}>
          <h2 className="profile-section-title">Account</h2>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: 16,
              background: 'var(--bg-elev)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt=""
                width="44"
                height="44"
                style={{ width: 44, height: 44, borderRadius: 999, objectFit: 'cover' }}
              />
            ) : (
              <span className="avatar avatar--initial" style={{ width: 44, height: 44 }}>
                {(user.display_name || user.username || '?').charAt(0).toUpperCase()}
              </span>
            )}
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontWeight: 800 }}>{user.display_name || user.username}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>@{user.username}</div>
            </div>
            <button type="button" className="btn btn-ghost btn--sm" onClick={logout}>
              <Icon name="logOut" size={14} /> Sign out
            </button>
          </div>
        </section>
      )}

      <section style={{ display: 'grid', gap: 10 }}>
        <h2 className="profile-section-title">Shortcuts</h2>
        <div style={{ display: 'grid', gap: 8 }}>
          {LINKS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: '12px 14px',
                background: 'var(--bg-elev)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <span>
                <span style={{ display: 'block', fontWeight: 700, fontSize: '0.88rem' }}>{item.label}</span>
                <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.76rem' }}>{item.description}</span>
              </span>
              <Icon name="chevronRight" size={15} />
            </Link>
          ))}
        </div>
      </section>

      <section className="settings-about">
        <h2 className="profile-section-title">About Madflix</h2>
        <div className="settings-about__inner">
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
      </section>
    </div>
  )
}
