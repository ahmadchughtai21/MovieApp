import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'
import Icon from './Icon'

function formatPosition(seconds) {
  if (!seconds) return ''
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export default function ResumeBanner({ tmdbId, mediaType, season, episode, title }) {
  const { user } = useAuth()
  const [session, setSession] = useState(null)

  useEffect(() => {
    if (!user || !tmdbId) return
    let active = true
    api.sessionResume(tmdbId, mediaType, season || undefined, episode || undefined)
      .then((data) => { if (active && data.active !== false) setSession(data) })
      .catch(() => {})
    return () => { active = false }
  }, [user, tmdbId, mediaType, season, episode])

  if (!user || !session) return null

  const progressPct = session.duration_seconds > 0
    ? Math.round((session.position_seconds / session.duration_seconds) * 100)
    : 0

  const linkTo = mediaType === 'tv'
    ? `/shows/${tmdbId}?s=${session.season}&e=${session.episode}`
    : `/movies/${tmdbId}`

  const label = mediaType === 'tv' && session.season && session.episode
    ? `S${session.season}E${session.episode}`
    : null

  return (
    <Link to={linkTo} className="resume-banner">
      <div className="resume-banner-icon">
        <Icon name="play" size={20} />
      </div>
      <div className="resume-banner-info">
        <span className="resume-banner-label">Resume{label ? ` ${label}` : ''}</span>
        {session.position_seconds > 0 && (
          <span className="resume-banner-time">
            {formatPosition(session.position_seconds)}
            {session.duration_seconds > 0 && ` of ${formatPosition(session.duration_seconds)}`}
          </span>
        )}
      </div>
      {progressPct > 0 && (
        <div className="resume-banner-progress">
          <div className="resume-banner-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
      )}
    </Link>
  )
}
