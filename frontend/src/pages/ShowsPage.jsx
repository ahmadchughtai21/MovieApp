import { useEffect, useState, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import Hero from '../components/Hero'
import Section from '../components/Section'
import MediaRail from '../components/MediaRail'
import MediaCard from '../components/MediaCard'
import { HeroSkeleton, CardSkeleton } from '../components/Loading'
import ErrorState from '../components/ErrorState'
import ShowFilterBar from '../components/ShowFilterBar'

export default function ShowsPage() {
  useDocumentTitle(null)
  const [searchParams] = useSearchParams()
  const genreId = searchParams.get('genre')
  const searchQuery = searchParams.get('q') || ''
  const [data, setData] = useState(null)
  const [genreResults, setGenreResults] = useState([])
  const [genrePage, setGenrePage] = useState(1)
  const [genreHasMore, setGenreHasMore] = useState(true)
  const [genreLoading, setGenreLoading] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const [searchPage, setSearchPage] = useState(1)
  const [searchHasMore, setSearchHasMore] = useState(true)
  const [searchLoading, setSearchLoading] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const sentinelRef = useRef(null)

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

  useEffect(() => {
    if (!genreId) {
      setGenreResults([])
      setGenrePage(1)
      setGenreHasMore(true)
      return
    }
    let active = true
    setGenreLoading(true)
    setGenreResults([])
    setGenrePage(1)
    setGenreHasMore(true)
    api.showsByGenre(genreId, 1)
      .then((payload) => {
        if (active) {
          setGenreResults(payload?.results || [])
          setGenreHasMore((payload?.page || 1) < (payload?.total_pages || 1))
          setError('')
        }
      })
      .catch((err) => {
        if (active) setError(err.message)
      })
      .finally(() => {
        if (active) setGenreLoading(false)
      })
    return () => { active = false }
  }, [genreId])

  useEffect(() => {
    if (!searchQuery) {
      setSearchResults([])
      setSearchPage(1)
      setSearchHasMore(true)
      return
    }
    let active = true
    setSearchLoading(true)
    setSearchResults([])
    setSearchPage(1)
    setSearchHasMore(true)
    api.showsSearch(searchQuery, 1)
      .then((payload) => {
        if (active) {
          setSearchResults(payload?.results || [])
          setSearchHasMore((payload?.page || 1) < (payload?.total_pages || 1))
          setError('')
        }
      })
      .catch((err) => {
        if (active) setError(err.message)
      })
      .finally(() => {
        if (active) setSearchLoading(false)
      })
    return () => { active = false }
  }, [searchQuery])

  const loadMoreGenre = useCallback(() => {
    if (!genreId || !genreHasMore || genreLoading) return
    const nextPage = genrePage + 1
    setGenreLoading(true)
    api.showsByGenre(genreId, nextPage)
      .then((payload) => {
        setGenreResults(prev => [...prev, ...(payload?.results || [])])
        setGenrePage(nextPage)
        setGenreHasMore(nextPage < (payload?.total_pages || 1))
      })
      .catch(() => {})
      .finally(() => setGenreLoading(false))
  }, [genreId, genrePage, genreHasMore, genreLoading])

  const loadMoreSearch = useCallback(() => {
    if (!searchQuery || !searchHasMore || searchLoading) return
    const nextPage = searchPage + 1
    setSearchLoading(true)
    api.showsSearch(searchQuery, nextPage)
      .then((payload) => {
        setSearchResults(prev => [...prev, ...(payload?.results || [])])
        setSearchPage(nextPage)
        setSearchHasMore(nextPage < (payload?.total_pages || 1))
      })
      .catch(() => {})
      .finally(() => setSearchLoading(false))
  }, [searchQuery, searchPage, searchHasMore, searchLoading])

  const loadMore = useCallback(() => {
    if (genreId) loadMoreGenre()
    else if (searchQuery) loadMoreSearch()
  }, [genreId, searchQuery, loadMoreGenre, loadMoreSearch])

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

  if (loading && !data) {
    return (
      <div className="page shows-page">
        <HeroSkeleton />
        <Section title="Popular shows">
          <CardSkeleton count={8} />
        </Section>
      </div>
    )
  }
  if (error) return <div className="page shows-page"><ErrorState message={error} /></div>

  const showTrending = data?.shows?.trending_this_week?.results || []
  const showPopular = data?.shows?.popular?.results || []
  const showAiring = data?.shows?.airing_today?.results || []
  const showTopRated = data?.shows?.top_rated?.results || []
  const showGenres = data?.genres?.shows || []

  const isGenreView = !!genreId
  const isSearchView = !!searchQuery
  const isFilteredView = isGenreView || isSearchView

  const heroItems = isSearchView
    ? searchResults.slice(0, 3)
    : isGenreView
      ? genreResults.slice(0, 3)
      : showTrending.length > 0 ? showTrending.slice(0, 3) : []

  const activeGenreName = genreId && showGenres.length > 0
    ? showGenres.find(g => String(g.id) === String(genreId))?.name || ''
    : ''

  const activeResults = isSearchView ? searchResults : genreResults
  const activeLoading = isSearchView ? searchLoading : genreLoading

  return (
    <div className="page shows-page">
      <Hero items={heroItems} kind="show" />

      <ShowFilterBar genres={showGenres} />

      {isFilteredView ? (
        <Section
          title={isSearchView ? `Results for "${searchQuery}"` : activeGenreName ? `${activeGenreName} shows` : 'Shows by genre'}
          subtitle={isSearchView
            ? (searchLoading ? 'Searching…' : `${searchResults.length} matches`)
            : (activeGenreName ? `Showing all ${activeGenreName} shows` : '')
          }
        >
          <div className="genre-results-grid">
            {activeResults.map((item) => (
              <MediaCard key={item.id} item={item} kind="show" to={`/shows/${item.id}`} />
            ))}
          </div>
          {activeLoading && (
            <div className="genre-loading">
              <CardSkeleton count={8} />
            </div>
          )}
          <div ref={sentinelRef} className="genre-sentinel" />
          {!activeLoading && activeResults.length === 0 && (
            <p className="genre-empty">{isSearchView ? 'No shows found.' : 'No shows found for this genre.'}</p>
          )}
        </Section>
      ) : (
        <>
          <Section
            title="Trending shows"
            subtitle="What everyone's watching this week"
          >
            <MediaRail>
              {showTrending.map((item) => (
                <MediaCard key={item.id} item={item} kind="show" to={`/shows/${item.id}`} />
              ))}
            </MediaRail>
          </Section>

          <Section
            title="Popular shows"
            subtitle="Crowd favorites right now"
          >
            <MediaRail>
              {showPopular.map((item) => (
                <MediaCard key={item.id} item={item} kind="show" to={`/shows/${item.id}`} />
              ))}
            </MediaRail>
          </Section>

          <Section
            title="Airing today"
            subtitle="Fresh episodes dropping today"
          >
            <MediaRail>
              {showAiring.map((item) => (
                <MediaCard key={item.id} item={item} kind="show" to={`/shows/${item.id}`} />
              ))}
            </MediaRail>
          </Section>

          <Section
            title="Top rated shows"
            subtitle="Critics and fans agree"
          >
            <MediaRail>
              {showTopRated.map((item) => (
                <MediaCard key={item.id} item={item} kind="show" to={`/shows/${item.id}`} />
              ))}
            </MediaRail>
          </Section>
        </>
      )}
    </div>
  )
}
