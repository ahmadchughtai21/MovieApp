import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import Section from './Section'
import MediaRail from './MediaRail'
import MediaCard from './MediaCard'

export default function RecommendedForYou() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }
    let active = true
    api.recommendations()
      .then((data) => {
        if (active) setItems(data.results || [])
      })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [user])

  if (!user || loading || items.length === 0) return null

  return (
    <Section
      title="Recommended for you"
      subtitle="Based on what you've watched"
    >
      <MediaRail>
        {items.slice(0, 20).map((item) => (
          <MediaCard
            key={item.id}
            item={item}
            kind={item.media_type === 'tv' ? 'show' : 'movie'}
            to={item.media_type === 'tv' ? `/shows/${item.id}` : `/movies/${item.id}`}
          />
        ))}
      </MediaRail>
    </Section>
  )
}
