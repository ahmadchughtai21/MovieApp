import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'
import { useImageConfig } from '../lib/imageConfig'
import Section from './Section'

const IMG_BASE = 'https://image.tmdb.org/t/p'

export default function ContinueWatching() {
  const { user } = useAuth()
  const { sizes } = useImageConfig()
  const [items, setItems] = useState([])

  useEffect(() => {
    if (!user) return
    let active = true
    api.continueWatching()
      .then((data) => { if (active) setItems(data) })
      .catch(() => {})
    return () => { active = false }
  }, [user])

  if (!user || items.length === 0) return null

  const posterSize = sizes?.poster || 'w342'

  return (
    <Section title="Continue Watching" subtitle="Pick up where you left off">
      <div className="cw-rail">
        {items.map((item) => {
          const posterUrl = item.poster_path ? `${IMG_BASE}/${posterSize}${item.poster_path}` : null
          const linkTo = item.media_type === 'tv'
            ? `/shows/${item.tmdb_id}?s=${item.season || 1}&e=${item.episode || 1}`
            : `/movies/${item.tmdb_id}`
          const episodeLabel = item.season && item.episode ? `S${item.season} E${item.episode}` : null
          const progressPct = item.duration_seconds > 0
            ? Math.round((item.position_seconds / item.duration_seconds) * 100)
            : 0

          return (
            <Link key={`${item.tmdb_id}-${item.season}-${item.episode}`} to={linkTo} className="cw-card">
              <div
                className="cw-poster"
                style={{
                  background: posterUrl ? `url(${posterUrl}) center/cover` : 'var(--bg-elevated)',
                }}
              />
              <div className="cw-body">
                <div className="cw-title">{item.title || `#${item.tmdb_id}`}</div>
                {episodeLabel && <div className="cw-episode">{episodeLabel}</div>}
                {progressPct > 0 && (
                  <div className="cw-progress">
                    <div className="cw-progress-fill" style={{ width: `${progressPct}%` }} />
                  </div>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </Section>
  )
}
