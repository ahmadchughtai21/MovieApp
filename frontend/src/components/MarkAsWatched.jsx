import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'
import Icon from './Icon'
import AuthPrompt from './AuthPrompt'

export default function MarkAsWatched({ tmdbId, mediaType, title, posterPath, season, episode }) {
  const { user } = useAuth()
  const [watched, setWatched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showAuth, setShowAuth] = useState(false)

  useEffect(() => {
    if (!user || !tmdbId) return
    let active = true
    api.checkWatched(tmdbId, mediaType, season || undefined, episode || undefined)
      .then((data) => { if (active) setWatched(data.watched) })
      .catch(() => {})
    return () => { active = false }
  }, [user, tmdbId, mediaType, season, episode])

  const toggle = async () => {
    if (!user) { setShowAuth(true); return }
    setLoading(true)
    try {
      const next = !watched
      await api.markAsWatched({
        tmdb_id: tmdbId,
        media_type: mediaType,
        title,
        poster_path: posterPath,
        season: season || null,
        episode: episode || null,
        completed: next,
      })
      setWatched(next)
    } catch (err) {
      console.error('Mark as watched failed:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <AuthPrompt open={showAuth} onClose={() => setShowAuth(false)} />
      <button
        type="button"
        className={`btn btn-ghost watchlist-btn${watched ? ' active' : ''}`}
        onClick={toggle}
        disabled={loading}
        aria-label={watched ? 'Mark as unwatched' : 'Mark as watched'}
      >
        <Icon name="check" size={18} className={watched ? 'heart-filled' : ''} />
        <span>{watched ? 'Watched' : 'Mark as Watched'}</span>
      </button>
    </>
  )
}
