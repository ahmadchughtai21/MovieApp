import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { useImageConfig } from '../lib/imageConfig'
import { buildImageUrl } from '../lib/image'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import Icon from '../components/Icon'
import VipModal from '../components/VipModal'

function avatarInitial(username) {
  return (username || '?').charAt(0).toUpperCase()
}

function CandidateSkeleton() {
  return (
    <div
      style={{
        background: 'var(--bg-elev)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: 18,
      }}
      aria-hidden="true"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div className="skeleton" style={{ width: 56, height: 56, borderRadius: 999, flex: 'none' }} />
        <div style={{ flex: 1 }}>
          <div className="skeleton skeleton-line medium" style={{ marginBottom: 8 }} />
          <div className="skeleton skeleton-line short" />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginTop: 18 }}>
        {[0, 1, 2, 3].map((item) => (
          <div
            key={item}
            className="skeleton"
            style={{ aspectRatio: '2 / 3', borderRadius: 8 }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
        <div className="skeleton" style={{ height: 36, borderRadius: 99, flex: 1 }} />
        <div className="skeleton" style={{ height: 36, borderRadius: 99, flex: 1 }} />
        <div className="skeleton" style={{ height: 36, borderRadius: 99, flex: 1 }} />
      </div>
    </div>
  )
}

export default function CineSwipePage() {
  useDocumentTitle('CineSwipe')
  const { user, refreshUser } = useAuth()
  const { baseUrl } = useImageConfig()

  const [candidates, setCandidates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [acting, setActing] = useState(false)
  const [isLimitReached, setIsLimitReached] = useState(false)
  const [notice, setNotice] = useState('')

  const loadCandidates = useCallback(() => {
    if (!user) return
    setLoading(true)
    setError('')
    api.getSwipeCandidates()
      .then((data) => setCandidates(Array.isArray(data) ? data : []))
      .catch(() => setError('Could not load swipe candidates.'))
      .finally(() => setLoading(false))
  }, [user])

  useEffect(() => {
    if (!user) return undefined
    let active = true
    api.getSwipeCandidates()
      .then((data) => {
        if (active) setCandidates(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        if (active) setError('Could not load swipe candidates.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [user])

  const candidate = candidates[0] || null

  async function swipe(action) {
    if (!candidate || acting) return
    setActing(true)
    try {
      const result = await api.sendSwipeAction(candidate.id, action)
      setCandidates((prev) => prev.slice(1))
      if (action === 'right' || action === 'super') {
        setNotice(result?.matched ? "It's a match! You can message them now." : 'Friend request sent.')
      } else {
        setNotice('')
      }
    } catch (err) {
      if (err.status === 403) {
        setIsLimitReached(true)
      } else {
        setError('Could not save your swipe.')
      }
    } finally {
      setActing(false)
    }
  }

  const posters = candidate?.recent_logs || []

  if (!user) {
    return (
      <div className="page swipe-page">
        <div className="page-head">
          <h1>CineSwipe</h1>
          <p className="page-sub">Find your next cinema buddy.</p>
        </div>
        <div className="dm-empty">
          <Icon name="heart" size={28} />
          <strong>Sign in to swipe</strong>
          <span>Sign in to see people near you and match on taste.</span>
          <Link to="/login" className="btn btn--accent btn--sm">Sign in</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="page swipe-page">
      <div className="page-head">
        <h1>CineSwipe</h1>
        <p className="page-sub">Find your next cinema buddy.</p>
      </div>

      {notice && <div className="swipe-notice">{notice}</div>}
      {error && <div className="auth-error">{error}</div>}

      {loading ? (
        <CandidateSkeleton />
      ) : candidate ? (
        <div className="swipe-layout">
          <article className="swipe-card">
            <div className="swipe-card__head">
              {candidate.avatar_url ? (
                <img
                  className="swipe-card__avatar"
                  src={candidate.avatar_url}
                  alt=""
                />
              ) : (
                <span className="swipe-card__avatar swipe-card__avatar--initial">
                  {avatarInitial(candidate.display_name || candidate.username)}
                </span>
              )}
              <div style={{ minWidth: 0, flex: 1 }}>
                <Link to={`/user/${candidate.username}`} className="swipe-card__name">
                  {candidate.display_name || candidate.username}
                </Link>
                <div className="swipe-card__handle">@{candidate.username}</div>
              </div>
              <span className="swipe-card__match">{candidate.match_percentage}% match</span>
            </div>

            <div className="swipe-posters">
              {[0, 1, 2, 3].map((index) => {
                const film = posters[index]
                return (
                  <div key={index} className="swipe-poster">
                    {film?.poster_path ? (
                      <img
                        src={buildImageUrl({ baseUrl }, film.poster_path, 'poster')}
                        alt={film.title || `Movie ${film.tmdb_id}`}
                        loading="lazy"
                      />
                    ) : (
                      <span className="swipe-poster__empty">
                        {film?.title || 'No film'}
                      </span>
                    )}
                    {film?.title && (
                      <span className="swipe-poster__title">{film.title}</span>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="swipe-actions">
              <button
                type="button"
                className="btn btn--ghost btn--full"
                onClick={() => swipe('left')}
                disabled={acting}
              >
                ✕ Pass
              </button>
              <button
                type="button"
                className="btn btn--accent btn--full"
                onClick={() => swipe('right')}
                disabled={acting}
              >
                <Icon name="heart" size={14} /> Follow
              </button>
              <button
                type="button"
                className="btn btn--ghost btn--full"
                onClick={() => {
                  if (!user?.is_vip) {
                    setIsLimitReached(true)
                    return
                  }
                  swipe('super')
                }}
                disabled={acting}
              >
                <Icon name="star" size={14} /> Super
                {!user?.is_vip && <span className="super-vip">VIP</span>}
              </button>
            </div>
          </article>

          <aside className="swipe-side">
            <section className="swipe-panel">
              <div className="swipe-panel__head">
                <h2>Taste profile</h2>
                <span>{candidate.match_percentage}% match</span>
              </div>

              {candidate.bio && <p className="swipe-panel__bio">{candidate.bio}</p>}

              <div className="swipe-stats">
                <div className="swipe-stat">
                  <strong>{candidate.avg_rating != null ? Number(candidate.avg_rating).toFixed(1) : '—'}</strong>
                  <span>Avg rating</span>
                </div>
                <div className="swipe-stat">
                  <strong>{candidate.total_logged || 0}</strong>
                  <span>Films logged</span>
                </div>
                <div className="swipe-stat swipe-stat--accent">
                  <strong>{candidate.match_percentage}%</strong>
                  <span>Taste match</span>
                </div>
              </div>

              <div className="swipe-faves">
                <div className="swipe-fave">
                  <span className="swipe-fave__icon"><Icon name="film" size={15} /></span>
                  <span>
                    <span className="swipe-fave__label">Favorite director</span>
                    <span className="swipe-fave__name">{candidate.fav_director_name || 'Not set'}</span>
                  </span>
                </div>
                <div className="swipe-fave">
                  <span className="swipe-fave__icon"><Icon name="user" size={15} /></span>
                  <span>
                    <span className="swipe-fave__label">Favorite actor</span>
                    <span className="swipe-fave__name">{candidate.fav_actor_name || 'Not set'}</span>
                  </span>
                </div>
              </div>

              <Link to={`/user/${candidate.username}`} className="btn btn--ghost btn--sm swipe-panel__link">
                View full profile
              </Link>
            </section>
          </aside>
        </div>
      ) : (
        <div
          style={{
            padding: 40,
            textAlign: 'center',
            color: 'var(--text-muted)',
            border: '1px dashed var(--border)',
            borderRadius: 'var(--radius-lg)',
            display: 'grid',
            gap: 14,
            justifyItems: 'center',
          }}
        >
          <span>You've seen everyone for now. Check back soon.</span>
        </div>
      )}

      <VipModal
        open={isLimitReached}
        onClose={() => setIsLimitReached(false)}
        onUpgraded={() => {
          if (refreshUser) refreshUser()
          loadCandidates()
        }}
      />
    </div>
  )
}
