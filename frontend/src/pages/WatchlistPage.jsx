import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'
import { buildImageUrl } from '../lib/image'
import { useImageConfig } from '../lib/imageConfig'
import Icon from '../components/Icon'
import Loading from '../components/Loading'
import ErrorState from '../components/ErrorState'
import PageBanner from '../components/PageBanner'

export default function WatchlistPage() {
  const { user } = useAuth()
  const config = useImageConfig()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    api.watchlist()
      .then((payload) => {
        if (active) setData(payload)
      })
      .catch((err) => {
        if (active) setError(err.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  const removeItem = async (item) => {
    try {
      await api.watchlistRemove(item.id)
      setData((prev) => (Array.isArray(prev) ? prev.filter((i) => i.id !== item.id) : prev))
    } catch (err) {
      console.error('Remove failed:', err)
    }
  }

  if (!user) {
    return (
      <div className="page">
        <PageBanner
          title="Watchlist"
          subtitle="Sign in to save films and shows for later"
          eyebrow="Library"
        />
        <div className="state">
          <div className="state-title">Sign in to use your watchlist</div>
          <p className="error-state">Save titles here and pick up where you left off.</p>
          <Link to="/login" className="btn btn--accent">Sign in</Link>
        </div>
      </div>
    )
  }
  if (error) return <div className="page"><ErrorState message={error} /></div>
  if (loading) return <div className="page"><Loading /></div>

  const movieItems = Array.isArray(data) ? data.filter((i) => i.media_type === 'movie') : []
  const showItems = Array.isArray(data) ? data.filter((i) => i.media_type === 'tv') : []
  const total = movieItems.length + showItems.length

  const renderCard = (item) => {
    const image = buildImageUrl(config, item.poster_path, 'poster', 'w342')
    const linkTo = item.media_type === 'movie' ? `/movie/${item.tmdb_id}` : `/show/${item.tmdb_id}`
    return (
      <div key={item.id} className="media-card">
        <div className="media-poster">
          <Link to={linkTo}>
            {image ? (
              <img src={image} alt={item.title || 'Untitled'} loading="lazy" decoding="async" />
            ) : (
              <div className="poster-fallback">No image</div>
            )}
          </Link>
          <button className="wl-remove-btn" onClick={() => removeItem(item)} aria-label="Remove from watchlist">
            <Icon name="x" size={14} />
          </button>
        </div>
        <div className="media-info">
          <Link to={linkTo} className="media-title" title={item.title}>{item.title}</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <PageBanner
        title="Watchlist"
        subtitle={`${total} ${total === 1 ? 'title' : 'titles'} saved`}
        eyebrow="Library"
      />

      {movieItems.length > 0 && (
        <div className="section">
          <div className="section-head">
            <div>
              <h2 className="section-title">Movies</h2>
              <p className="section-sub">{movieItems.length} in watchlist</p>
            </div>
          </div>
          <div className="wl-grid">
            {movieItems.map(renderCard)}
          </div>
        </div>
      )}

      {showItems.length > 0 && (
        <div className="section">
          <div className="section-head">
            <div>
              <h2 className="section-title">TV Shows</h2>
              <p className="section-sub">{showItems.length} in watchlist</p>
            </div>
          </div>
          <div className="wl-grid">
            {showItems.map(renderCard)}
          </div>
        </div>
      )}

      {movieItems.length === 0 && showItems.length === 0 && (
        <div className="state">
          <div className="state-title">Your list is empty</div>
          <p className="error-state">Save films and shows you want to watch later.</p>
          <Link to="/discover" className="btn btn--accent">Browse the catalog</Link>
        </div>
      )}
    </div>
  )
}
