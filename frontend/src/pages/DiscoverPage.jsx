import { useEffect, useState, useRef, useCallback } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import Section from '../components/Section'
import MediaRail from '../components/MediaRail'
import MediaCard from '../components/MediaCard'
import AutoHeroSlider from '../components/AutoHeroSlider'
import FeedSearch from '../components/FeedSearch'
import { CardSkeleton } from '../components/Loading'
import ErrorState from '../components/ErrorState'

const TABS = [
  { key: 'movie', label: 'Movies' },
  { key: 'tv', label: 'TV Shows' },
]

export default function DiscoverPage() {
  useDocumentTitle('Discover')
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab') === 'tv' ? 'tv' : 'movie'
  const genreId = searchParams.get('genre')
  const searchQuery = searchParams.get('q') || ''

  const [data, setData] = useState(null)
  const [results, setResults] = useState([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [resultsLoading, setResultsLoading] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const sentinelRef = useRef(null)

  const kind = tab // 'movie' | 'tv'

  useEffect(() => {
    let active = true
    setLoading(true)
    api.home()
      .then((payload) => {
        if (active) {
          setData(payload)
          setError('')
        }
      })
      .catch((err) => {
        if (active) setError(err.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  const fetchPage = useCallback((pageNum, append) => {
    const byGenre = genreId
      ? (kind === 'tv' ? api.showsByGenre : api.moviesByGenre)(genreId, pageNum)
      : null
    const bySearch = searchQuery
      ? (kind === 'tv' ? api.showsSearch : api.moviesSearch)(searchQuery, pageNum)
      : null
    const call = byGenre || bySearch
    if (!call) return Promise.resolve()
    setResultsLoading(true)
    return call
      .then((payload) => {
        setResults((prev) => (append ? [...prev, ...(payload?.results || [])] : (payload?.results || [])))
        setPage(pageNum)
        setHasMore((payload?.page || 1) < (payload?.total_pages || 1))
        setError('')
      })
      .catch((err) => setError(err.message))
      .finally(() => setResultsLoading(false))
  }, [genreId, searchQuery, kind])

  useEffect(() => {
    setResults([])
    setPage(1)
    setHasMore(true)
    if (genreId || searchQuery) fetchPage(1, false)
  }, [genreId, searchQuery, kind, fetchPage])

  const loadMore = useCallback(() => {
    if (!hasMore || resultsLoading) return
    fetchPage(page + 1, true)
  }, [hasMore, resultsLoading, page, fetchPage])

  useEffect(() => {
    if ((!genreId && !searchQuery) || !sentinelRef.current) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore()
      },
      { rootMargin: '400px' }
    )
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [genreId, searchQuery, loadMore])

  const setParam = (key, value) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    setSearchParams(next)
  }

  if (loading && !data) {
    return (
      <div className="page page--bleed discover-page">
        <div className="hero-slider skeleton-hero discover-hero-skeleton" />
        <Section title="Discover">
          <CardSkeleton count={8} />
        </Section>
      </div>
    )
  }
  if (error && !data) return <div className="page discover-page"><ErrorState message={error} /></div>

  const genres = kind === 'tv' ? (data?.genres?.shows || []) : (data?.genres?.movies || [])
  const isFiltered = !!(genreId || searchQuery)
  const detailTo = (id) => (kind === 'tv' ? `/show/${id}` : `/movie/${id}`)

  const trending = kind === 'tv'
    ? (data?.shows?.trending_this_week?.results || [])
    : (data?.movies?.trending_this_week?.results || [])
  const popular = kind === 'tv'
    ? (data?.shows?.popular?.results || [])
    : (data?.movies?.popular?.results || [])
  const topRated = kind === 'tv'
    ? (data?.shows?.top_rated?.results || [])
    : (data?.movies?.top_rated?.results || [])
  const extra = kind === 'tv'
    ? (data?.shows?.airing_today?.results || [])
    : (data?.movies?.upcoming?.results || [])

  const activeGenreName = genreId && genres.length > 0
    ? genres.find((g) => String(g.id) === String(genreId))?.name || ''
    : ''

  const heroItems = !isFiltered ? trending.slice(0, 6) : []

  return (
    <div className={`page${isFiltered ? '' : ' page--bleed'} discover-page`}>
      {!isFiltered && heroItems.length > 0 && (
        <div className="discover-hero">
          <AutoHeroSlider items={heroItems} kind={kind === 'tv' ? 'show' : 'movie'} limit={6} />
        </div>
      )}

      <header className="discover-head">
        <div>
          <p className="discover-kicker">Browse the catalog</p>
          <h1 className="discover-title">Discover</h1>
        </div>
        <div className="discover-tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              className={`discover-tab${tab === t.key ? ' discover-tab--active' : ''}`}
              onClick={() => {
                const next = new URLSearchParams()
                next.set('tab', t.key)
                setSearchParams(next)
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      {genres.length > 0 && (
        <div className="discover-genres">
          <button
            className={`genre-chip${!genreId ? ' genre-chip--active' : ''}`}
            onClick={() => setParam('genre', '')}
          >
            All
          </button>
          {genres.map((g) => (
            <button
              key={g.id}
              className={`genre-chip${String(genreId) === String(g.id) ? ' genre-chip--active' : ''}`}
              onClick={() => setParam('genre', String(g.id))}
            >
              {g.name}
            </button>
          ))}
        </div>
      )}

      <FeedSearch />

      {isFiltered ? (
        <Section
          title={searchQuery ? `Results for "${searchQuery}"` : activeGenreName ? `${activeGenreName} ${kind === 'tv' ? 'shows' : 'movies'}` : 'Browse'}
          subtitle={resultsLoading ? 'Loading…' : `${results.length} matches`}
        >
          <div className="genre-results-grid">
            {results.map((item) => (
              <MediaCard key={item.id} item={item} kind={kind === 'tv' ? 'show' : 'movie'} to={detailTo(item.id)} />
            ))}
          </div>
          {resultsLoading && (
            <div className="genre-loading">
              <CardSkeleton count={8} />
            </div>
          )}
          <div ref={sentinelRef} className="genre-sentinel" />
          {!resultsLoading && results.length === 0 && (
            <p className="genre-empty">Nothing found. Try another genre.</p>
          )}
        </Section>
      ) : (
        <>
          <Section title={`Trending ${kind === 'tv' ? 'shows' : 'movies'}`} subtitle="What everyone's watching this week">
            <MediaRail>
              {trending.map((item) => (
                <MediaCard key={item.id} item={item} kind={kind === 'tv' ? 'show' : 'movie'} to={detailTo(item.id)} />
              ))}
            </MediaRail>
          </Section>

          <Section title={`Popular ${kind === 'tv' ? 'shows' : 'movies'}`} subtitle="Crowd favorites right now">
            <MediaRail>
              {popular.map((item) => (
                <MediaCard key={item.id} item={item} kind={kind === 'tv' ? 'show' : 'movie'} to={detailTo(item.id)} />
              ))}
            </MediaRail>
          </Section>

          <Section
            title={kind === 'tv' ? 'Airing today' : 'Upcoming movies'}
            subtitle={kind === 'tv' ? 'On TV right now' : 'Coming soon to theaters'}
          >
            <MediaRail>
              {extra.map((item) => (
                <MediaCard key={item.id} item={item} kind={kind === 'tv' ? 'show' : 'movie'} to={detailTo(item.id)} />
              ))}
            </MediaRail>
          </Section>

          <Section title={`Top rated ${kind === 'tv' ? 'shows' : 'movies'}`} subtitle="Critics and fans agree">
            <MediaRail>
              {topRated.map((item) => (
                <MediaCard key={item.id} item={item} kind={kind === 'tv' ? 'show' : 'movie'} to={detailTo(item.id)} />
              ))}
            </MediaRail>
          </Section>
        </>
      )}
    </div>
  )
}
