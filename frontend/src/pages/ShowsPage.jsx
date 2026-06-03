import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import Section from '../components/Section'
import MediaCard from '../components/MediaCard'
import Pager from '../components/Pager'
import { GridSkeleton } from '../components/Loading'
import ErrorState from '../components/ErrorState'

const categories = [
  { key: 'popular', label: 'Popular' },
  { key: 'trending', label: 'Trending' },
  { key: 'top-rated', label: 'Top rated' },
  { key: 'airing-today', label: 'Airing today' },
  { key: 'on-the-air', label: 'On the air' }
]

export default function ShowsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [genres, setGenres] = useState([])
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const category = searchParams.get('category') || 'popular'
  const timeWindow = searchParams.get('time') || 'week'
  const genre = searchParams.get('genre') || ''
  const query = searchParams.get('q') || ''
  const page = Number(searchParams.get('page') || 1)

  useEffect(() => {
    api.showGenres().then((payload) => setGenres(payload.genres || [])).catch(() => setGenres([]))
  }, [])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')

    const fetcher = async () => {
      if (query) return api.showsSearch(query, page)
      if (genre) return api.showsByGenre(genre, page)
      if (category === 'trending') return api.showsTrending(timeWindow)
      if (category === 'top-rated') return api.showsTopRated(page)
      if (category === 'airing-today') return api.showsAiringToday(page)
      if (category === 'on-the-air') return api.showsOnTheAir(page)
      return api.showsPopular(page)
    }

    fetcher()
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
  }, [category, genre, page, query, timeWindow])

  const results = data?.results || []
  const totalPages = Math.min(data?.total_pages || 1, 500)

  const categoryLabel = useMemo(() => {
    if (query) return `Search: ${query}`
    if (genre) {
      const found = genres.find((item) => String(item.id) === String(genre))
      return found ? `${found.name} shows` : 'Genre picks'
    }
    const found = categories.find((item) => item.key === category)
    return found ? `${found.label} shows` : 'TV Shows'
  }, [category, genres, query, genre])

  useDocumentTitle(categoryLabel)

  function setParam(next) {
    const params = new URLSearchParams(searchParams)
    Object.entries(next).forEach(([key, value]) => {
      if (value === '' || value === null) params.delete(key)
      else params.set(key, value)
    })
    params.delete('page')
    setSearchParams(params)
  }

  function setPage(nextPage) {
    const params = new URLSearchParams(searchParams)
    params.set('page', String(nextPage))
    setSearchParams(params)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (error) return <ErrorState message={error} />

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>TV Shows</h1>
          <p className="page-sub">Find every series, from premieres to classics.</p>
        </div>
      </div>

      <div className="filter-bar">
        <div className="filter-group">
          {categories.map((item) => (
            <button
              key={item.key}
              className={`chip${category === item.key ? ' active' : ''}`}
              onClick={() => setParam({ category: item.key, q: '', genre: '' })}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="filter-row">
          <div className="filter-group">
            <select
              className="select"
              value={genre}
              onChange={(event) => setParam({ genre: event.target.value, q: '' })}
            >
              <option value="">All genres</option>
              {genres.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
            {category === 'trending' ? (
              <div className="filter-group">
                <button
                  className={`chip${timeWindow === 'day' ? ' active' : ''}`}
                  onClick={() => setParam({ time: 'day' })}
                >
                  Today
                </button>
                <button
                  className={`chip${timeWindow === 'week' ? ' active' : ''}`}
                  onClick={() => setParam({ time: 'week' })}
                >
                  This week
                </button>
              </div>
            ) : null}
          </div>
          <form
            className="inline-search"
            onSubmit={(event) => {
              event.preventDefault()
              const form = new FormData(event.currentTarget)
              const value = String(form.get('show-query') || '')
              setParam({ q: value, genre: '' })
            }}
          >
            <input name="show-query" placeholder="Search shows…" defaultValue={query} />
            <button type="submit">Go</button>
          </form>
        </div>
      </div>

      <Section title={categoryLabel} subtitle={loading ? 'Loading…' : `${results.length} titles`}>
        {loading ? (
          <GridSkeleton count={12} />
        ) : results.length === 0 ? (
          <div className="state">
            <div className="state-title">No shows found</div>
            <p>Try a different category, genre, or search term.</p>
          </div>
        ) : (
          <>
            <div className="grid">
              {results.map((item) => (
                <MediaCard key={item.id} item={item} kind="show" to={`/shows/${item.id}`} />
              ))}
            </div>
            <Pager page={page} totalPages={totalPages} onPage={setPage} />
          </>
        )}
      </Section>
    </div>
  )
}
