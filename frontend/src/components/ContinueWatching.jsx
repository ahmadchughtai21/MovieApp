import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'
import MediaRail from './MediaRail'
import MediaCard from './MediaCard'
import Section from './Section'

export default function ContinueWatching() {
  const { user } = useAuth()
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

  return (
    <Section title="Continue Watching" subtitle="Pick up where you left off">
      <MediaRail>
        {items.map((item) => {
          const kind = item.media_type === 'tv' ? 'show' : 'movie'
          const to = kind === 'show'
            ? `/shows/${item.tmdb_id}?s=${item.season || 1}&e=${item.episode || 1}`
            : `/movies/${item.tmdb_id}`
          const progressPct = item.duration_seconds > 0
            ? Math.round((item.position_seconds / item.duration_seconds) * 100)
            : 0
          const apiItem = {
            id: item.tmdb_id,
            title: item.title,
            poster_path: item.poster_path,
          }
          return (
            <div key={`${item.tmdb_id}-${item.season}-${item.episode}`} className="cw-wrapper">
              <MediaCard item={apiItem} to={to} kind={kind} />
              {progressPct > 0 && (
                <div className="cw-progress-bar">
                  <div className="cw-progress-fill" style={{ width: `${progressPct}%` }} />
                </div>
              )}
            </div>
          )
        })}
      </MediaRail>
    </Section>
  )
}