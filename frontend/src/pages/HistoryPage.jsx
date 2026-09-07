import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'
import { useImageConfig } from '../lib/imageConfig'
import Icon from '../components/Icon'
import Loading from '../components/Loading'

const IMG_BASE = 'https://image.tmdb.org/t/p'

function formatTimestamp(ts) {
  const d = new Date(ts)
  const now = new Date()
  const diff = now - d
  if (diff < 60000) return 'Just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return d.toLocaleDateString()
}

function formatWatchTime(seconds) {
  if (!seconds) return null
  const m = Math.floor(seconds / 60)
  if (m < 1) return '< 1 min'
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  return `${h}h ${m % 60}m`
}

export default function HistoryPage() {
  const { user } = useAuth()
  const { sizes } = useImageConfig()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    api.history()
      .then((data) => setItems(data))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [user])

  if (!user) {
    return (
      <div className="page-head" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <h1>Sign in to view your history</h1>
        <Link to="/login" className="btn btn-accent" style={{ marginTop: '16px' }}>Sign In</Link>
      </div>
    )
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Watch History</h1>
          <p className="page-sub">{items.length} {items.length === 1 ? 'entry' : 'entries'}</p>
        </div>
      </div>

      {loading ? (
        <Loading />
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <Icon name="play" size={48} className="" style={{ opacity: 0.3 }} />
          <p style={{ marginTop: '16px' }}>No watch history yet</p>
          <Link to="/movies" className="btn btn-ghost" style={{ marginTop: '12px' }}>Start Watching</Link>
        </div>
      ) : (
        <div className="history-list">
          {items.map((item) => {
            const posterSize = sizes?.poster || 'w342'
            const posterUrl = item.poster_path ? `${IMG_BASE}/${posterSize}${item.poster_path}` : null
            const linkTo = item.media_type === 'tv'
              ? `/shows/${item.tmdb_id}?s=${item.season || 1}&e=${item.episode || 1}`
              : `/movies/${item.tmdb_id}`
            const episodeLabel = item.season && item.episode ? `S${item.season}E${item.episode}` : null
            const watchTime = formatWatchTime(item.progress_seconds)

            return (
              <Link key={item.id} to={linkTo} className="history-item">
                <div
                  className="history-poster"
                  style={{
                    width: 80,
                    height: 120,
                    borderRadius: 'var(--radius)',
                    background: posterUrl ? `url(${posterUrl}) center/cover` : 'var(--bg-elevated)',
                    flexShrink: 0,
                  }}
                />
                <div className="history-info">
                  <h3 className="history-title">{item.title || `TMDB ${item.tmdb_id}`}</h3>
                  <div className="history-meta">
                    {episodeLabel && <span className="history-badge">{episodeLabel}</span>}
                    <span className="history-time">{formatTimestamp(item.timestamp)}</span>
                    {watchTime && <span className="history-ip">Watched {watchTime}</span>}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
