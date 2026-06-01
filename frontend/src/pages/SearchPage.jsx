import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import Section from '../components/Section'
import MediaCard from '../components/MediaCard'
import Pager from '../components/Pager'
import Loading from '../components/Loading'
import ErrorState from '../components/ErrorState'

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const query = searchParams.get('q') || ''
  const page = Number(searchParams.get('page') || 1)

  useEffect(() => {
    if (!query) return
    let active = true
    setLoading(true)
    setError('')

    api.multiSearch(query, page)
      .then((payload) => {
        if (active) setData(payload)
      })
      .catch((err) => {
        if (active) setError(err.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [query, page])

  function setPage(nextPage) {
    const params = new URLSearchParams(searchParams)
    params.set('page', String(nextPage))
    setSearchParams(params)
  }

  if (!query) {
    return (
      <div className="page">
        <div className="empty-state">
          <h1>Search MadFlix</h1>
          <p>Type a title, series, or person in the top search bar.</p>
        </div>
      </div>
    )
  }

  if (loading) return <Loading label="Searching..." />
  if (error) return <ErrorState message={error} />

  const results = data?.results || []
  const totalPages = Math.min(data?.total_pages || 1, 500)

  return (
    <div className="page">
      <Section title={`Results for \"${query}\"`} subtitle="Movies, shows, and people">
        <div className="grid">
          {results.map((item) => {
            const mediaType = item.media_type || (item.first_air_date ? 'tv' : 'movie')
            if (mediaType === 'tv') {
              return <MediaCard key={`tv-${item.id}`} item={item} kind="show" to={`/shows/${item.id}`} />
            }
            if (mediaType === 'person') {
              return <MediaCard key={`person-${item.id}`} item={item} kind="person" to={`/search?q=${encodeURIComponent(item.name)}`} />
            }
            return <MediaCard key={`movie-${item.id}`} item={item} kind="movie" to={`/movies/${item.id}`} />
          })}
        </div>
        <Pager page={page} totalPages={totalPages} onPage={setPage} />
      </Section>
    </div>
  )
}
