import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'
import { buildImageUrl } from '../lib/image'
import { useImageConfig } from '../lib/imageConfig'
import Icon from '../components/Icon'
import Loading from '../components/Loading'
import ErrorState from '../components/ErrorState'

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
      <div className="page genres-page">
        <div className="genres-hero">
          <div className="genres-hero-content">
            <h1 className="genres-title">My Watchlist</h1>
            <p className="genres-subtitle">Your saved movies and shows</p>
          </div>
        </div>
        <div className="genres-section">
          <div className="genres-section-header">
            <h2 className="genres-section-title">No items in watchlist</h2>
            <p className="genres-section-sub">Sign in to save movies and shows</p>
          </div>
        </div>
      </div>
    )
  }
  if (error) return <div className="page"><ErrorState message={error} /></div>
  if (loading) return <div className="page"><Loading /></div>

  const movieItems = Array.isArray(data) ? data.filter((i) => i.media_type === 'movie') : []
  const showItems = Array.isArray(data) ? data.filter((i) => i.media_type === 'tv') : []

  const renderCard = (item) => {
    const image = buildImageUrl(config, item.poster_path, 'poster', 'w185')
    const linkTo = item.media_type === 'movie' ? `/movies/${item.tmdb_id}` : `/shows/${item.tmdb_id}`
    return (
      <div key={item.id} className="media-card">
        <div className="media-poster">
          <Link to={linkTo}>
            {image ? (
              <img src={image} alt={item.title} loading="lazy" decoding="async" />
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
      <div className="genres-hero">
        <div className="genres-hero-content">
          <h1 className="genres-title">My Watchlist</h1>
          <p className="genres-subtitle">Your saved movies and shows</p>
        </div>
      </div>

      {movieItems.length > 0 && (
        <div className="genres-section">
          <div className="genres-section-header">
            <h2 className="genres-section-title">Movies</h2>
            <p className="genres-section-sub">{movieItems.length} saved</p>
          </div>
          <div className="grid">
            {movieItems.map(renderCard)}
          </div>
        </div>
      )}

      {showItems.length > 0 && (
        <div className="genres-section">
          <div className="genres-section-header">
            <h2 className="genres-section-title">TV Shows</h2>
            <p className="genres-section-sub">{showItems.length} saved</p>
          </div>
          <div className="grid">
            {showItems.map(renderCard)}
          </div>
        </div>
      )}

      {movieItems.length === 0 && showItems.length === 0 && (
        <div className="genres-section">
          <div className="genres-section-header">
            <h2 className="genres-section-title">Your watchlist is empty</h2>
            <p className="genres-section-sub">Browse movies and shows to add to your watchlist</p>
          </div>
        </div>
      )}
    </div>
  )
}