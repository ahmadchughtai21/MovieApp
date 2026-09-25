import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import MediaRail from './MediaRail'
import Section from './Section'
import ClipCard from './ClipCard'

export default function ClipsStrip() {
  const [clips, setClips] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    api.clips({ limit: 12 })
      .then((data) => {
        if (active) {
          setClips(data.results)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message)
          setLoading(false)
        }
      })
    return () => { active = false }
  }, [])

  if (error) return null

  if (loading) {
    return (
      <Section title="Latest Clips" action="/clips" actionLabel="View all">
        <div className="media-rail-inner" style={{ paddingLeft: 0 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="media-card clip-card-mini" style={{ pointerEvents: 'none' }}>
              <div className="skeleton clip-card-thumb" />
              <div className="clip-card-info">
                <div className="skeleton skeleton-line short" />
                <div className="skeleton skeleton-line" style={{ width: '28%', marginTop: 6 }} />
              </div>
            </div>
          ))}
        </div>
      </Section>
    )
  }

  if (!clips.length) return null

  return (
    <Section title="Latest Clips" action="/clips" actionLabel="View all">
      <MediaRail>
        {clips.map((clip) => (
          <ClipCard key={clip.id} clip={clip} />
        ))}
      </MediaRail>
    </Section>
  )
}
