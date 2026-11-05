import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import Icon from '../components/Icon'
import { api } from '../lib/api'

const LINKS = [
  { to: '/profile', label: 'Edit profile', description: 'Bio, city, favourites, accent colour' },
  { to: '/watchlist', label: 'Watchlist', description: 'Titles you saved' },
  { to: '/clips', label: 'Clips', description: 'Your shared moments' },
]

export default function SettingsPage() {
  useDocumentTitle('Settings')
  const { user, logout } = useAuth()
  const [importFile, setImportFile] = useState(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [importError, setImportError] = useState('')

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

      {user && (
        <section style={{ display: 'grid', gap: 10 }}>
          <h2 className="profile-section-title">Import from Letterboxd</h2>
          <div className="settings-import">
            <p>
              Upload the ZIP from your Letterboxd export. We import your diary, ratings,
              reviews, bio, and watchlist. Existing entries are updated, never deleted.
            </p>
            <div className="settings-import__steps">
              <strong>How to export from Letterboxd</strong>
              <ol>
                <li>Sign in at letterboxd.com and open <em>Settings</em>.</li>
                <li>Go to <em>Data</em> → <em>Export your data</em>.</li>
                <li>Download the ZIP file from the email Letterboxd sends you.</li>
                <li>Choose that ZIP below and press Import.</li>
              </ol>
            </div>
            <div className="settings-import__row">
              <label className="btn btn-ghost btn--sm" htmlFor="letterboxd-zip">
                Choose ZIP
              </label>
              <input
                id="letterboxd-zip"
                type="file"
                accept=".zip,application/zip"
                className="avatar-upload__input"
                onChange={(event) => {
                  setImportFile(event.target.files?.[0] || null)
                  setImportResult(null)
                  setImportError('')
                }}
              />
              <span className="settings-import__file">
                {importFile ? importFile.name : 'No file selected'}
              </span>
              <button
                type="button"
                className="btn btn--accent btn--sm"
                onClick={async () => {
                  if (!importFile || importing) return
                  setImporting(true)
                  setImportError('')
                  setImportResult(null)
                  try {
                    const data = await api.importLetterboxd(importFile)
                    setImportResult(data)
                  } catch (err) {
                    setImportError(err?.message || 'Import failed.')
                  } finally {
                    setImporting(false)
                  }
                }}
                disabled={!importFile || importing}
              >
                {importing ? 'Importing…' : 'Import'}
              </button>
            </div>
            {importing && (
              <p className="page-sub">Importing your films. This can take a minute for large exports.</p>
            )}
            {importError && <div className="auth-error">{importError}</div>}
            {importResult && (
              <div className="settings-import__result">
                <strong>{importResult.message}</strong>
                <span>
                  {importResult.imported?.unmatched || 0} titles could not be matched on TMDB.
                </span>
              </div>
            )}
          </div>
        </section>
      )}

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
