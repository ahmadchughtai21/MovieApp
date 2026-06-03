import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import Section from '../components/Section'
import MediaCard from '../components/MediaCard'
import Pager from '../components/Pager'
import { GridSkeleton } from '../components/Loading'
import ErrorState from '../components/ErrorState'

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const query = searchParams.get('q') || ''
  const page = Number(searchParams.get('page') || 1)

  useDocumentTitle(query ? `Search: ${query}` : 'Search')

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
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (!query) {
    return (
      <div className="page">
        <div className="state">
          <div className="state-title">Search Madflix</div>
          <p>Type a title, series, or person in the search bar above.</p>
        </div>
      </div>
    )
  }

  if (error) return <ErrorState message={error} />

  const results = data?.results || []
  const totalPages = Math.min(data?.total_pages || 1, 500)

  return (
    <div className="page">
      <Section
        title={`Results for "${query}"`}
        subtitle={loading ? 'Searching…' : `${results.length} matches across movies, shows, and people`}
      >
        {loading ? (
          <GridSkeleton count={12} />
        ) : results.length === 0 ? (
          <div className="state">
            <div className="state-title">No matches</div>
            <p>Try a different search term or check your spelling.</p>
          </div>
        ) : (
          <>
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
          </>
        )}
      </Section>
    </div>
  )
}
