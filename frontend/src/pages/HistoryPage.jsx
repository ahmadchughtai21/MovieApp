import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'
import { buildImageUrl } from '../lib/image'
import { useImageConfig } from '../lib/imageConfig'
import Loading from '../components/Loading'
import ErrorState from '../components/ErrorState'
import PageBanner from '../components/PageBanner'

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
      <div className="page">
        <PageBanner
          title="Watch History"
          subtitle="Sign in to see what you've streamed"
          eyebrow="History"
        />
        <div className="state">
          <div className="state-title">No history yet</div>
          <p className="error-state">Start watching to build your history.</p>
          <Link to="/login" className="btn btn--accent">Sign in</Link>
        </div>
      </div>
    )
  }
  if (error) return <div className="page"><ErrorState message={error} /></div>
  if (loading) return <div className="page"><Loading /></div>

  const watchedMovies = Array.isArray(data) ? data.filter((i) => i.media_type === 'movie') : []
  const watchedShows = Array.isArray(data) ? data.filter((i) => i.media_type === 'tv') : []
  const total = watchedMovies.length + watchedShows.length

  const renderCard = (item) => {
    const image = buildImageUrl(config, item.poster_path, 'poster', 'w342')
    const linkTo = item.media_type === 'movie' ? `/movie/${item.tmdb_id}` : `/show/${item.tmdb_id}`
    return (
      <Link key={item.id} to={linkTo} className="media-card">
        <div className="media-poster">
          {image ? (
            <img src={image} alt={item.title || 'Untitled'} loading="lazy" decoding="async" />
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
      <PageBanner
        title="Watch History"
        subtitle={total > 0 ? `${total} ${total === 1 ? 'title' : 'titles'} streamed` : 'Everything you stream on Madflix'}
        eyebrow="History"
      />

      {watchedMovies.length > 0 && (
        <div className="section">
          <div className="section-head">
            <div>
              <h2 className="section-title">Movies</h2>
              <p className="section-sub">{watchedMovies.length} watched</p>
            </div>
          </div>
          <div className="grid">
            {watchedMovies.map(renderCard)}
          </div>
        </div>
      )}

      {watchedShows.length > 0 && (
        <div className="section">
          <div className="section-head">
            <div>
              <h2 className="section-title">TV Shows</h2>
              <p className="section-sub">{watchedShows.length} watched</p>
            </div>
          </div>
          <div className="grid">
            {watchedShows.map(renderCard)}
          </div>
        </div>
      )}

      {watchedMovies.length === 0 && watchedShows.length === 0 && (
        <div className="state">
          <div className="state-title">No watch history yet</div>
          <p className="error-state">Start watching to see your history</p>
          <Link to="/discover" className="btn btn--accent">Discover</Link>
        </div>
      )}
    </div>
  )
}
