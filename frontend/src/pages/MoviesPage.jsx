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
import MovieFilterBar from '../components/MovieFilterBar'

export default function MoviesPage() {
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
    api.moviesByGenre(genreId, 1)
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
    api.moviesSearch(searchQuery, 1)
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
    api.moviesByGenre(genreId, nextPage)
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
    api.moviesSearch(searchQuery, nextPage)
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
      <div className="page movies-page">
        <HeroSkeleton />
        <Section title="Popular movies">
          <CardSkeleton count={8} />
        </Section>
      </div>
    )
  }
  if (error) return <div className="page movies-page"><ErrorState message={error} /></div>

  const movieTrending = data?.movies?.trending_this_week?.results || []
  const moviePopular = data?.movies?.popular?.results || []
  const movieUpcoming = data?.movies?.upcoming?.results || []
  const movieTopRated = data?.movies?.top_rated?.results || []
  const movieGenres = data?.genres?.movies || []

  const isGenreView = !!genreId
  const isSearchView = !!searchQuery
  const isFilteredView = isGenreView || isSearchView

  const heroItems = isSearchView
    ? searchResults.slice(0, 3)
    : isGenreView
      ? genreResults.slice(0, 3)
      : movieTrending.length > 0 ? movieTrending.slice(0, 3) : []

  const activeGenreName = genreId && movieGenres.length > 0
    ? movieGenres.find(g => String(g.id) === String(genreId))?.name || ''
    : ''

  const activeResults = isSearchView ? searchResults : genreResults
  const activeLoading = isSearchView ? searchLoading : genreLoading

  return (
    <div className="page movies-page">
      <Hero items={heroItems} kind="movie" />

      <MovieFilterBar genres={movieGenres} />

      {isFilteredView ? (
        <Section
          title={isSearchView ? `Results for "${searchQuery}"` : activeGenreName ? `${activeGenreName} movies` : 'Movies by genre'}
          subtitle={isSearchView
            ? (searchLoading ? 'Searching…' : `${searchResults.length} matches`)
            : (activeGenreName ? `Showing all ${activeGenreName} movies` : '')
          }
        >
          <div className="genre-results-grid">
            {activeResults.map((item) => (
              <MediaCard key={item.id} item={item} kind="movie" to={`/movies/${item.id}`} />
            ))}
          </div>
          {activeLoading && (
            <div className="genre-loading">
              <CardSkeleton count={8} />
            </div>
          )}
          <div ref={sentinelRef} className="genre-sentinel" />
          {!activeLoading && activeResults.length === 0 && (
            <p className="genre-empty">{isSearchView ? 'No movies found.' : 'No movies found for this genre.'}</p>
          )}
        </Section>
      ) : (
        <>
          <Section
            title="Trending movies"
            subtitle="What everyone's watching this week"
          >
            <MediaRail>
              {movieTrending.map((item) => (
                <MediaCard key={item.id} item={item} kind="movie" to={`/movies/${item.id}`} />
              ))}
            </MediaRail>
          </Section>

          <Section
            title="Popular movies"
            subtitle="Crowd favorites right now"
          >
            <MediaRail>
              {moviePopular.map((item) => (
                <MediaCard key={item.id} item={item} kind="movie" to={`/movies/${item.id}`} />
              ))}
            </MediaRail>
          </Section>

          <Section
            title="Upcoming movies"
            subtitle="Coming soon to theaters"
          >
            <MediaRail>
              {movieUpcoming.map((item) => (
                <MediaCard key={item.id} item={item} kind="movie" to={`/movies/${item.id}`} />
              ))}
            </MediaRail>
          </Section>

          <Section
            title="Top rated movies"
            subtitle="Critics and fans agree"
          >
            <MediaRail>
              {movieTopRated.map((item) => (
                <MediaCard key={item.id} item={item} kind="movie" to={`/movies/${item.id}`} />
              ))}
            </MediaRail>
          </Section>
        </>
      )}
    </div>
  )
}
