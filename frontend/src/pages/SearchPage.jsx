import { useEffect, useState, useRef, useCallback } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import MediaCard from '../components/MediaCard'
import Icon from '../components/Icon'
import PageBanner from '../components/PageBanner'
import { GridSkeleton, CardSkeleton } from '../components/Loading'
import ErrorState from '../components/ErrorState'
import FoundingBadge from '../components/FoundingBadge'
import VipBadge from '../components/VipBadge'

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
  const [members, setMembers] = useState([])
  const [communities, setCommunities] = useState([])
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

  useEffect(() => {
    if (!searchQuery) return undefined
    let active = true
    Promise.allSettled([api.userSearch(searchQuery), api.communities()])
      .then(([userResult, communityResult]) => {
        if (!active) return
        setMembers(userResult.status === 'fulfilled' && Array.isArray(userResult.value) ? userResult.value : [])
        const all = communityResult.status === 'fulfilled' && Array.isArray(communityResult.value)
          ? communityResult.value
          : []
        const needle = searchQuery.toLowerCase()
        setCommunities(all.filter((circle) => (
          circle.name.toLowerCase().includes(needle)
          || circle.slug.toLowerCase().includes(needle)
          || (circle.description || '').toLowerCase().includes(needle)
          || (circle.genre_tag || '').toLowerCase().includes(needle)
        )))
      })
      .catch(() => {})
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
      <PageBanner
        title={searchQuery ? `Results for "${searchQuery}"` : 'Search'}
        subtitle={searchQuery ? `${results.length + members.length + communities.length} matches` : 'Find titles, people, and communities'}
        eyebrow={searchQuery ? 'Search' : 'Catalog'}
      />

      <div className="search-filter-bar">
        <div className="search-filter-inner">
          <form
            className="search"
            onSubmit={handleSearch}
            role="search"
          >
            <span className="search-icon" aria-hidden="true">
              <Icon name="search" size={18} />
            </span>
            <input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Search titles, people, or communities..."
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
              <GridSkeleton count={12} />
            </div>
          ) : results.length === 0 && members.length === 0 && communities.length === 0 ? (
            <div className="search-empty">
              <div className="search-empty-icon">
                <Icon name="search" size={48} />
              </div>
              <h3 className="search-empty-title">No results found</h3>
              <p className="search-empty-text">Try a different search term or check your spelling.</p>
            </div>
          ) : (
            <div className="search-results-section">
              {members.length > 0 && (
                <div className="search-category">
                  <div className="search-category-header">
                    <h2 className="search-category-title">Members</h2>
                    <span className="search-category-count">{members.length} results</span>
                  </div>
                  <div className="genre-results-grid">
                    {members.map((member) => (
                      <Link
                        key={`member-${member.username}`}
                        to={`/user/${member.username}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: 12,
                          background: 'var(--bg-elev)',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-md)',
                        }}
                      >
                        {member.avatar_url ? (
                          <img
                            src={member.avatar_url}
                            alt=""
                            width="40"
                            height="40"
                            style={{ width: 40, height: 40, borderRadius: 999, objectFit: 'cover', flex: 'none' }}
                          />
                        ) : (
                          <span className="avatar avatar--initial" style={{ width: 40, height: 40, flex: 'none' }}>
                            {member.username.charAt(0).toUpperCase()}
                          </span>
                        )}
                        <span style={{ minWidth: 0 }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700 }}>
                            {member.display_name || member.username}
                            {member.is_founding_member && <FoundingBadge size={10} />}
                            {member.is_vip && <VipBadge size={9} />}
                          </span>
                          <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.75rem' }}>@{member.username}</span>
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {communities.length > 0 && (
                <div className="search-category">
                  <div className="search-category-header">
                    <h2 className="search-category-title">Communities</h2>
                    <span className="search-category-count">{communities.length} results</span>
                  </div>
                  <div className="genre-results-grid">
                    {communities.map((circle) => (
                      <Link
                        key={`circle-${circle.slug}`}
                        to={`/communities?room=${circle.slug}`}
                        style={{
                          display: 'grid',
                          gap: 4,
                          padding: 14,
                          background: 'var(--bg-elev)',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-md)',
                        }}
                      >
                        <span style={{ fontWeight: 700 }}>{circle.name}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                          {circle.genre_tag} · {circle.member_count} members
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {movieResults.length > 0 && (
                <div className="search-category">
                  <div className="search-category-header">
                    <h2 className="search-category-title">Movies</h2>
                    <span className="search-category-count">{movieResults.length} results</span>
                  </div>
                  <div className="genre-results-grid">
                    {movieResults.map((item) => (
                      <MediaCard key={`movie-${item.id}`} item={item} kind="movie" to={`/movie/${item.id}`} />
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
                      <MediaCard key={`tv-${item.id}`} item={item} kind="show" to={`/show/${item.id}`} />
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
          <p className="search-empty-text">Type a movie, show, or person name above.</p>
        </div>
      )}
    </div>
  )
}
