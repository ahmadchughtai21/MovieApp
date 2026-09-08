import { useEffect, useState, useRef, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import MediaCard from '../components/MediaCard'
import Icon from '../components/Icon'
import { GridSkeleton, CardSkeleton } from '../components/Loading'
import ErrorState from '../components/ErrorState'

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [results, setResults] = useState([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [inputValue, setInputValue] = useState(searchParams.get('q') || '')
  const [focused, setFocused] = useState(false)
  const sentinelRef = useRef(null)

  const searchQuery = searchParams.get('q') || ''

  useDocumentTitle(searchQuery ? `Search: ${searchQuery}` : 'Search')

  useEffect(() => {
    setInputValue(searchQuery)
  }, [searchQuery])

  useEffect(() => {
    if (!searchQuery) {
      setResults([])
      setData(null)
      setPage(1)
      setHasMore(true)
      return
    }
    let active = true
    setInitialLoading(true)
    setResults([])
    setPage(1)
    setHasMore(true)
    api.multiSearch(searchQuery, 1)
      .then((payload) => {
        if (active) {
          setData(payload)
          setResults(payload?.results || [])
          setHasMore((payload?.page || 1) < (payload?.total_pages || 1))
          setError('')
        }
      })
      .catch((err) => {
        if (active) setError(err.message)
      })
      .finally(() => {
        if (active) setInitialLoading(false)
      })
    return () => { active = false }
  }, [searchQuery])

  const loadMore = useCallback(() => {
    if (!searchQuery || !hasMore || loading) return
    const nextPage = page + 1
    setLoading(true)
    api.multiSearch(searchQuery, nextPage)
      .then((payload) => {
        setResults(prev => [...prev, ...(payload?.results || [])])
        setPage(nextPage)
        setHasMore(nextPage < (payload?.total_pages || 1))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [searchQuery, page, hasMore, loading])

  useEffect(() => {
    if (!searchQuery || !sentinelRef.current) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore()
      },
      { rootMargin: '400px' }
    )
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [searchQuery, loadMore])

  function handleSearch(e) {
    e.preventDefault()
    const q = inputValue.trim()
    if (q) setSearchParams({ q })
  }

  const movieResults = results.filter(r => r.media_type === 'movie')
  const showResults = results.filter(r => r.media_type === 'tv')
  const personResults = results.filter(r => r.media_type === 'person')

  return (
    <div className="page search-page">
      <div className="search-hero">
        <div className="search-hero-content">
          <h1 className="search-title">Search Madflix</h1>
          <p className="search-subtitle">Find movies, shows, and people</p>
        </div>
      </div>

      <div className="search-filter-bar">
        <div className="search-filter-inner">
          <form
            className={`movie-search ${focused ? 'focused' : ''}`}
            onSubmit={handleSearch}
            role="search"
          >
            <span className="movie-search-icon" aria-hidden="true">
              <Icon name="search" size={18} />
            </span>
            <input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Search movies, shows, or people..."
              aria-label="Search"
              type="search"
            />
            <button type="submit">Search</button>
          </form>
        </div>
      </div>

      {error && <ErrorState message={error} />}

      {searchQuery && !error && (
        <>
          {initialLoading ? (
            <div className="search-results-section">
              <div className="search-results-header">
                <h2 className="search-results-title">Searching for "{searchQuery}"</h2>
                <p className="search-results-sub">Loading results...</p>
              </div>
              <GridSkeleton count={12} />
            </div>
          ) : results.length === 0 ? (
            <div className="search-empty">
              <div className="search-empty-icon">
                <Icon name="search" size={48} />
              </div>
              <h3 className="search-empty-title">No results found</h3>
              <p className="search-empty-text">Try a different search term or check your spelling.</p>
            </div>
          ) : (
            <div className="search-results-section">
              {movieResults.length > 0 && (
                <div className="search-category">
                  <div className="search-category-header">
                    <h2 className="search-category-title">Movies</h2>
                    <span className="search-category-count">{movieResults.length} results</span>
                  </div>
                  <div className="genre-results-grid">
                    {movieResults.map((item) => (
                      <MediaCard key={`movie-${item.id}`} item={item} kind="movie" to={`/movies/${item.id}`} />
                    ))}
                  </div>
                </div>
              )}

              {showResults.length > 0 && (
                <div className="search-category">
                  <div className="search-category-header">
                    <h2 className="search-category-title">TV Shows</h2>
                    <span className="search-category-count">{showResults.length} results</span>
                  </div>
                  <div className="genre-results-grid">
                    {showResults.map((item) => (
                      <MediaCard key={`tv-${item.id}`} item={item} kind="show" to={`/shows/${item.id}`} />
                    ))}
                  </div>
                </div>
              )}

              {personResults.length > 0 && (
                <div className="search-category">
                  <div className="search-category-header">
                    <h2 className="search-category-title">People</h2>
                    <span className="search-category-count">{personResults.length} results</span>
                  </div>
                  <div className="genre-results-grid">
                    {personResults.map((item) => (
                      <MediaCard key={`person-${item.id}`} item={item} kind="person" to={`/search?q=${encodeURIComponent(item.name)}`} />
                    ))}
                  </div>
                </div>
              )}

              {loading && (
                <div className="genre-loading">
                  <CardSkeleton count={8} />
                </div>
              )}
              <div ref={sentinelRef} className="genre-sentinel" />
            </div>
          )}
        </>
      )}

      {!searchQuery && !error && (
        <div className="search-empty">
          <div className="search-empty-icon">
            <Icon name="search" size={48} />
          </div>
          <h3 className="search-empty-title">Start searching</h3>
          <p className="search-empty-text">Type a movie, show, or person name in the search bar above.</p>
        </div>
      )}
    </div>
  )
}
