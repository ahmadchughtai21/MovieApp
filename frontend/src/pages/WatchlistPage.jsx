import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'
import { useImageConfig } from '../lib/imageConfig'
import Icon from '../components/Icon'
import Loading from '../components/Loading'

const IMG_BASE = 'https://image.tmdb.org/t/p'

export default function WatchlistPage() {
  const { user } = useAuth()
  const { sizes } = useImageConfig()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    if (!user) return
    setLoading(true)
    api.watchlist()
      .then((data) => setItems(data))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [user])

  if (!user) {
    return (
      <div className="page-head" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <h1>Sign in to view your watchlist</h1>
        <Link to="/login" className="btn btn-accent" style={{ marginTop: '16px' }}>Sign In</Link>
      </div>
    )
  }

  const filtered = filter === 'all' ? items : items.filter((i) => i.media_type === filter)

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">My Watchlist</h1>
          <p className="page-sub">{items.length} {items.length === 1 ? 'item' : 'items'}</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {['all', 'movie', 'tv'].map((f) => (
          <button
            key={f}
            type="button"
            className={`chip${filter === f ? ' active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All' : f === 'movie' ? 'Movies' : 'TV Shows'}
          </button>
        ))}
      </div>

      {loading ? (
        <Loading />
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <Icon name="heart" size={48} className="" style={{ opacity: 0.3 }} />
          <p style={{ marginTop: '16px' }}>Your watchlist is empty</p>
          <Link to="/movies" className="btn btn-ghost" style={{ marginTop: '12px' }}>Browse Movies</Link>
        </div>
      ) : (
        <div className="grid">
          {filtered.map((item) => {
            const posterSize = sizes?.poster || 'w342'
            const posterUrl = item.poster_path ? `${IMG_BASE}/${posterSize}${item.poster_path}` : null
            const linkTo = item.media_type === 'tv' ? `/shows/${item.tmdb_id}` : `/movies/${item.tmdb_id}`
            return (
              <Link key={item.id} to={linkTo} className="media-card" style={{ width: '100%' }}>
                <div className="media-card-poster" style={{ aspectRatio: '2/3', background: posterUrl ? `url(${posterUrl}) center/cover` : 'var(--bg-elevated)' }} />
                <div className="media-card-body">
                  <h3 className="media-card-title">{item.title || `TMDB ${item.tmdb_id}`}</h3>
                  <span className="media-card-meta">{item.media_type === 'tv' ? 'TV Show' : 'Movie'}</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
