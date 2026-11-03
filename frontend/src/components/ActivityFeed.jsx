import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import StarRating from './StarRating'
import Loading from './Loading'
import AuthPrompt from './AuthPrompt'
import FoundingBadge from './FoundingBadge'
import VipBadge from './VipBadge'

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

function timeAgo(iso) {
  if (!iso) return ''
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const SCOPES = [
  { key: 'friends', label: 'Friends' },
  { key: 'global', label: 'Global' },
]

function hydrateDetails(feedItems, setDetails) {
  ;(feedItems || []).forEach(({ log }) => {
    if (!log) return
    const endpoint = log.media_type === 'tv'
      ? api.showDetails(log.tmdb_id)
      : api.movieDetails(log.tmdb_id)
    endpoint
      .then((d) => {
        const item = log.media_type === 'tv' ? d.show_details : d.movie_details
        if (item) {
          setDetails((prev) => (prev[log.tmdb_id] ? prev : { ...prev, [log.tmdb_id]: item }))
        }
      })
      .catch(() => {})
  })
}

export default function ActivityFeed({ limit = 40, showSuggested = true, title = 'Activity' }) {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const initialScope = searchParams.get('scope') === 'global' ? 'global' : 'friends'
  const [scope, setScope] = useState(user ? initialScope : 'global')
  const [items, setItems] = useState([])
  const [showAll, setShowAll] = useState(false)
  const [suggested, setSuggested] = useState([])
  const [loading, setLoading] = useState(true)
  const [details, setDetails] = useState({})
  const [following, setFollowing] = useState({})
  const [showAuth, setShowAuth] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    setShowAll(false)
    Promise.all([api.feed(scope).catch(() => []), api.suggestedUsers().catch(() => [])])
      .then(([feedItems, suggestedUsers]) => {
        if (!active) return
        setItems(feedItems || [])
        setSuggested(suggestedUsers || [])
        hydrateDetails(feedItems, setDetails)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [limit, scope])

  const toggleLike = async (item) => {
    if (!user) {
      setShowAuth(true)
      return
    }
    const log = item.log
    const prev = { liked_by_me: log.liked_by_me, like_count: log.like_count }
    setItems((is) =>
      is.map((it) =>
        it.log.id === log.id
          ? { ...it, log: { ...it.log, liked_by_me: !log.liked_by_me, like_count: (log.like_count || 0) + (log.liked_by_me ? -1 : 1) } }
          : it
      )
    )
    try {
      const res = await api.logToggleLike(log.id)
      setItems((is) =>
        is.map((it) =>
          it.log.id === log.id ? { ...it, log: { ...it.log, liked_by_me: res.liked, like_count: res.like_count } } : it
        )
      )
    } catch {
      setItems((is) =>
        is.map((it) => (it.log.id === log.id ? { ...it, log: { ...it.log, ...prev } } : it))
      )
    }
  }

  const toggleFollow = async (username) => {
    if (!user) {
      setShowAuth(true)
      return
    }
    try {
      const res = await api.followToggle(username)
      setFollowing((f) => ({ ...f, [username]: res.following }))
      if (res.following) setSuggested((ss) => ss.filter((s) => s.username !== username))
      if (scope === 'friends' && res.following) {
        const feedItems = await api.feed('friends').catch(() => [])
        setItems(feedItems || [])
        hydrateDetails(feedItems, setDetails)
      }
    } catch { /* ignore */ }
  }

  const isFollowed = (username) => {
    if (following[username] !== undefined) return following[username]
    return items.some((it) => it.actor?.username === username && it.actor?.is_following)
  }

  if (loading) return <Loading />

  const visible = showAll ? items : items.slice(0, limit)

  return (
    <div className="feed-wrap feed-wrap--rail">
      <div className="feed-head feed-head--compact">
        <div>
          <h2 className="feed-title">{title}</h2>
          <p className="feed-sub">What film people are logging and loving</p>
        </div>
        {user && (
          <div className="feed-scope" role="tablist" aria-label="Activity scope">
            {SCOPES.map((s) => (
              <button
                key={s.key}
                role="tab"
                aria-selected={scope === s.key}
                className={`feed-scope__btn${scope === s.key ? ' feed-scope__btn--active' : ''}`}
                onClick={() => {
                  setScope(s.key)
                  const next = new URLSearchParams(searchParams)
                  if (s.key === 'friends') next.delete('scope')
                  else next.set('scope', s.key)
                  window.history.replaceState(null, '', `${window.location.pathname}?${next.toString()}`)
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <div className="feed-empty">
          <p>
            {scope === 'friends'
              ? "Nothing here yet. Follow people to see what they're watching."
              : 'No activity yet. Check back soon.'}
          </p>
        </div>
      ) : (
        <div className="activity-rail">
          {visible.map((item, i) => {
            const log = item.log
            if (!log) return null
            const d = details[log.tmdb_id]
            const mediaTitle = d?.title || d?.name || ''
            const poster = d?.poster_path
            const mediaPath = log.media_type === 'tv' ? `/show/${log.tmdb_id}` : `/movie/${log.tmdb_id}`
            const link = item.type === 'log' && log.review ? `/review/${log.id}` : mediaPath
            const key = `${item.type}-${log.id}-${item.timestamp}-${i}`
            const actor = item.actor || {}
            const showFollow =
              user &&
              actor.username &&
              actor.username !== user.username &&
              actor.is_following !== undefined &&
              !isFollowed(actor.username)

            return (
              <article key={key} className="activity-card">
                <Link to={link} className="activity-card__poster" aria-label={mediaTitle || 'Open title'}>
                  {poster ? (
                    <img
                      src={`https://image.tmdb.org/t/p/w342${poster}`}
                      alt={mediaTitle}
                      loading="lazy"
                    />
                  ) : (
                    <span className="activity-card__fallback">{mediaTitle || '—'}</span>
                  )}
                  <span className="activity-card__shade" />

                  {log.rating != null && (
                    <span className="activity-card__rating">★ {Number(log.rating).toFixed(1)}</span>
                  )}

                  <span className="activity-card__body">
                    <span className="activity-card__title">{mediaTitle || 'Loading…'}</span>
                    <span className="activity-card__meta">
                      <Avatar name={actor.display_name} url={actor.avatar_url} size={20} />
                      <span>{actor.display_name}</span>
                      {actor.is_founding_member && <FoundingBadge size={10} />}
                      {actor.is_vip && <VipBadge size={9} />}
                      <span className="activity-card__dot">·</span>
                      <span>{item.type === 'like' ? 'liked' : 'logged'} {timeAgo(item.timestamp)}</span>
                    </span>
                    {item.type === 'log' && log.review && (
                      <span className="activity-card__review">{log.review}</span>
                    )}
                    {showFollow && (
                      <span
                        role="button"
                        tabIndex={0}
                        className="activity-card__follow"
                        onClick={(event) => {
                          event.preventDefault()
                          event.stopPropagation()
                          toggleFollow(actor.username)
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            toggleFollow(actor.username)
                          }
                        }}
                      >
                        + Follow
                      </span>
                    )}
                  </span>
                </Link>

                <button
                  type="button"
                  className={`activity-like${log.liked_by_me ? ' activity-like--active' : ''}`}
                  onClick={() => toggleLike(item)}
                  title={user ? 'Like this entry' : 'Sign in to like'}
                  aria-label="Like entry"
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill={log.liked_by_me ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                  <span>{log.like_count || 0}</span>
                </button>
              </article>
            )
          })}
        </div>
      )}

      {!showAll && items.length > limit && (
        <button className="feed-see-all" onClick={() => setShowAll(true)}>
          Show more
        </button>
      )}

      <AuthPrompt open={showAuth} onClose={() => setShowAuth(false)} />
    </div>
  )
}
