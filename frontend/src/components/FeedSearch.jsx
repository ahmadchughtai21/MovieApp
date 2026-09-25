import { useEffect, useState, useRef, useCallback } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import MediaCard from './MediaCard'
import Icon from './Icon'
import Loading from './Loading'

function Avatar({ name, url, size = 36 }) {
  if (url) {
    return <img className="avatar" src={url} alt={name} style={{ width: size, height: size }} />
  }
  const initial = (name || '?').charAt(0).toUpperCase()
  return (
    <span className="avatar avatar--initial" style={{ width: size, height: size, fontSize: size * 0.45 }}>
      {initial}
    </span>
  )
}

const LIMIT = 6

export default function FeedSearch() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const [input, setInput] = useState(searchParams.get('q') || '')
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [users, setUsers] = useState([])
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [followingMap, setFollowingMap] = useState({})
  const debounceRef = useRef(null)
  const runIdRef = useRef(0)

  useEffect(() => {
    const q = searchParams.get('q') || ''
    setInput(q)
    setQuery(q)
  }, [searchParams])

  useEffect(() => {
    const q = query.trim()
    if (!q) {
      setUsers([])
      setResults([])
      setLoading(false)
      setError('')
      return
    }
    const runId = ++runIdRef.current
    setLoading(true)
    setError('')
    Promise.all([
      api.userSearch(q).catch(() => []),
      api.multiSearch(q, 1).catch(() => null),
    ]).then(([userList, multi]) => {
      if (runId !== runIdRef.current) return
      setUsers(userList || [])
      setResults(multi?.results || [])
      setFollowingMap((prev) => {
        const next = { ...prev }
        ;(userList || []).forEach((u) => {
          if (u.is_following !== undefined) next[u.username] = u.is_following
        })
        return next
      })
    }).catch((e) => {
      if (runId === runIdRef.current) setError(e.message || 'Search failed')
    }).finally(() => {
      if (runId === runIdRef.current) setLoading(false)
    })
  }, [query])

  const onInput = useCallback((value) => {
    setInput(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const next = value.trim()
      setQuery(next)
      const params = new URLSearchParams(searchParams)
      if (next) params.set('q', next)
      else params.delete('q')
      const qs = params.toString()
      const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname
      if (window.location.pathname === '/') {
        window.history.replaceState(null, '', url)
      }
    }, 320)
  }, [searchParams])

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
  }, [])

  const toggleFollow = async (username) => {
    if (!user) {
      navigate('/login')
      return
    }
    try {
      const res = await api.followToggle(username)
      setFollowingMap((m) => ({ ...m, [username]: res.following }))
    } catch { /* ignore */ }
  }

  const submit = (e) => {
    e.preventDefault()
    const next = input.trim()
    setQuery(next)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (next) navigate(`/search?q=${encodeURIComponent(next)}`)
  }

  const movies = results.filter((r) => r.media_type === 'movie').slice(0, LIMIT)
  const shows = results.filter((r) => r.media_type === 'tv').slice(0, LIMIT)
  const people = results.filter((r) => r.media_type === 'person').slice(0, LIMIT)
  const hasQuery = Boolean(query.trim())
  const empty = hasQuery && !loading && !error && users.length === 0 && results.length === 0

  return (
    <section className="feed-search" aria-label="Search Madflix">
      <div className="feed-search__head">
        <h2 className="feed-search__title">
          <Icon name="search" size={16} />
          Search
        </h2>
        <p className="feed-search__sub">People, movies, shows, and cast</p>
      </div>

      <form className="feed-search__form search" onSubmit={submit} role="search">
        <span className="search-icon" aria-hidden="true">
          <Icon name="search" size={15} />
        </span>
        <input
          value={input}
          onChange={(e) => onInput(e.target.value)}
          placeholder="Search members, titles, cast…"
          aria-label="Search feed"
          type="search"
        />
        <button type="submit">Search</button>
      </form>

      {loading && hasQuery && (
        <div className="feed-search__loading">
          <Loading label="Searching…" />
        </div>
      )}

      {error && hasQuery && (
        <p className="feed-search__empty">{error}</p>
      )}

      {empty && (
        <p className="feed-search__empty">
          No matches for “{query}”. Try a member name, title, or actor.
        </p>
      )}

      {hasQuery && !loading && !error && (users.length > 0 || results.length > 0) && (
        <div className="feed-search__results">
          {users.length > 0 && (
            <div className="feed-search__group">
              <div className="feed-search__group-head">
                <h3>Members</h3>
                <span>{users.length}</span>
              </div>
              <ul className="feed-search__users">
                {users.map((person) => {
                  const isFollowed = followingMap[person.username] ?? person.is_following
                  return (
                    <li key={person.username} className="feed-search__user">
                      <Link to={`/user/${person.username}`} className="feed-search__user-link">
                        <Avatar name={person.display_name} url={person.avatar_url} size={32} />
                        <span className="feed-search__user-info">
                          <span className="feed-search__user-name">{person.display_name}</span>
                          <span className="feed-search__user-handle">@{person.username}</span>
                        </span>
                      </Link>
                      {user && !person.is_me && (
                        <button
                          className="btn btn-ghost btn--sm"
                          onClick={() => toggleFollow(person.username)}
                          disabled={isFollowed === true}
                        >
                          {isFollowed ? 'Following' : 'Follow'}
                        </button>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          {movies.length > 0 && (
            <div className="feed-search__group">
              <div className="feed-search__group-head">
                <h3>Movies</h3>
                <Link className="feed-search__more" to={`/search?q=${encodeURIComponent(query)}`}>
                  See all
                </Link>
              </div>
              <div className="feed-search__grid">
                {movies.map((item) => (
                  <MediaCard key={`movie-${item.id}`} item={item} kind="movie" to={`/movie/${item.id}`} />
                ))}
              </div>
            </div>
          )}

          {shows.length > 0 && (
            <div className="feed-search__group">
              <div className="feed-search__group-head">
                <h3>TV shows</h3>
                <Link className="feed-search__more" to={`/search?q=${encodeURIComponent(query)}`}>
                  See all
                </Link>
              </div>
              <div className="feed-search__grid">
                {shows.map((item) => (
                  <MediaCard key={`tv-${item.id}`} item={item} kind="show" to={`/show/${item.id}`} />
                ))}
              </div>
            </div>
          )}

          {people.length > 0 && (
            <div className="feed-search__group">
              <div className="feed-search__group-head">
                <h3>Cast &amp; people</h3>
                <Link className="feed-search__more" to={`/search?q=${encodeURIComponent(query)}`}>
                  See all
                </Link>
              </div>
              <div className="feed-search__grid">
                {people.map((item) => (
                  <MediaCard
                    key={`person-${item.id}`}
                    item={item}
                    kind="person"
                    to={`/search?q=${encodeURIComponent(item.name)}`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
