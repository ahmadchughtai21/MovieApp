import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import MediaRail from './MediaRail'
import ClipCard from './ClipCard'

export default function MediaClips({ tmdbId, mediaType }) {
  const [clips, setClips] = useState(null)

  useEffect(() => {
    let active = true
    setClips(null)
    api.clips({ tmdb_id: tmdbId, media_type: mediaType, limit: 12 })
      .then((data) => { if (active) setClips(data.results || []) })
      .catch(() => { if (active) setClips([]) })
    return () => { active = false }
  }, [tmdbId, mediaType])

  if (!clips || clips.length === 0) return null

  return (
    <section className="md-section media-clips">
      <h2 className="md-section-title">
        Community Clips <span className="reviews-section__count">({clips.length})</span>
      </h2>
      <MediaRail>
        {clips.map((clip) => (
          <ClipCard key={clip.id} clip={clip} />
        ))}
      </MediaRail>
    </section>
  )
}
