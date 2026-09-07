import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'
import Icon from './Icon'
import AuthPrompt from './AuthPrompt'

export default function WatchlistButton({ tmdbId, mediaType, title, posterPath }) {
  const { user } = useAuth()
  const [inWatchlist, setInWatchlist] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showAuth, setShowAuth] = useState(false)

  useEffect(() => {
    if (!user || !tmdbId) return
    let active = true
    api.watchlistCheck(tmdbId, mediaType)
      .then((data) => { if (active) setInWatchlist(data.in_watchlist) })
      .catch(() => {})
    return () => { active = false }
  }, [user, tmdbId, mediaType])

  const toggle = useCallback(async () => {
    if (!user) { setShowAuth(true); return }
    setLoading(true)
    try {
      if (inWatchlist) {
        const items = await api.watchlist(mediaType)
        const item = items.find((i) => i.tmdb_id === tmdbId && i.media_type === mediaType)
        if (item) {
          await api.watchlistRemove(item.id)
          setInWatchlist(false)
        }
      } else {
        await api.watchlistAdd({ tmdb_id: tmdbId, media_type: mediaType, title, poster_path: posterPath })
        setInWatchlist(true)
      }
    } catch (err) {
      console.error('Watchlist toggle failed:', err)
    } finally {
      setLoading(false)
    }
  }, [user, inWatchlist, tmdbId, mediaType, title, posterPath])

  return (
    <>
      <AuthPrompt open={showAuth} onClose={() => setShowAuth(false)} />
      <button
        type="button"
        className={`btn btn-ghost watchlist-btn${inWatchlist ? ' active' : ''}`}
        onClick={toggle}
        disabled={loading}
        aria-label={inWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
      >
        <Icon name="heart" size={18} className={inWatchlist ? 'heart-filled' : ''} />
        <span>{inWatchlist ? 'In Watchlist' : 'Add to Watchlist'}</span>
      </button>
    </>
  )
}
