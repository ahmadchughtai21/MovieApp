import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'
import { buildImageUrl } from '../lib/image'
import { useImageConfig } from '../lib/imageConfig'
import Loading from '../components/Loading'
import ErrorState from '../components/ErrorState'

export default function HistoryPage() {
  const { user } = useAuth()
  const config = useImageConfig()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    api.history()
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

  if (!user) {
    return (
      <div className="page genres-page">
        <div className="genres-hero">
          <div className="genres-hero-content">
            <h1 className="genres-title">Watch History</h1>
            <p className="genres-subtitle">Your watched movies and shows</p>
          </div>
        </div>
        <div className="genres-section">
          <div className="genres-section-header">
            <h2 className="genres-section-title">No history yet</h2>
            <p className="genres-section-sub">Start watching to see your history</p>
          </div>
        </div>
      </div>
    )
  }
  if (error) return <div className="page"><ErrorState message={error} /></div>
  if (loading) return <div className="page"><Loading /></div>

  const watchedMovies = Array.isArray(data) ? data.filter((i) => i.media_type === 'movie') : []
  const watchedShows = Array.isArray(data) ? data.filter((i) => i.media_type === 'tv') : []

  const renderCard = (item) => {
    const image = buildImageUrl(config, item.poster_path, 'poster', 'w185')
    const linkTo = item.media_type === 'movie' ? `/movies/${item.tmdb_id}` : `/shows/${item.tmdb_id}`
    return (
      <Link key={item.id} to={linkTo} className="media-card">
        <div className="media-poster">
          {image ? (
            <img src={image} alt={item.title} loading="lazy" decoding="async" />
          ) : (
            <div className="poster-fallback">No image</div>
          )}
        </div>
        <div className="media-info">
          <div className="media-title" title={item.title}>{item.title}</div>
        </div>
      </Link>
    )
  }

  return (
    <div className="page">
      <div className="genres-hero">
        <div className="genres-hero-content">
          <h1 className="genres-title">Watch History</h1>
          <p className="genres-subtitle">Your watched movies and shows</p>
        </div>
      </div>

      {watchedMovies.length > 0 && (
        <div className="genres-section">
          <div className="genres-section-header">
            <h2 className="genres-section-title">Movies</h2>
            <p className="genres-section-sub">Your watched movies</p>
          </div>
          <div className="grid">
            {watchedMovies.map(renderCard)}
          </div>
        </div>
      )}

      {watchedShows.length > 0 && (
        <div className="genres-section">
          <div className="genres-section-header">
            <h2 className="genres-section-title">TV Shows</h2>
            <p className="genres-section-sub">Your watched shows</p>
          </div>
          <div className="grid">
            {watchedShows.map(renderCard)}
          </div>
        </div>
      )}

      {watchedMovies.length === 0 && watchedShows.length === 0 && (
        <div className="genres-section">
          <div className="genres-section-header">
            <h2 className="genres-section-title">No watch history yet</h2>
            <p className="genres-section-sub">Start watching to see your history</p>
          </div>
        </div>
      )}
    </div>
  )
}