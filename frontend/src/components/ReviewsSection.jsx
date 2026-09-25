import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import StarRating from './StarRating'
import AuthPrompt from './AuthPrompt'
import Icon from './Icon'

function formatTime(dateString) {
  const date = new Date(dateString)
  const diff = Math.floor((Date.now() - date.getTime()) / 1000)
  if (diff < 60) return 'now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
}

function errText(err, fallback) {
  try {
    const data = JSON.parse(err.message)
    if (data?.body?.[0]) return data.body[0]
    if (data?.detail) return data.detail
    if (data?.error) return data.error
  } catch { /* not json */ }
  return fallback
}

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

export default function ReviewsSection({ tmdbId, mediaType }) {
  const { user } = useAuth()
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAuth, setShowAuth] = useState(false)
  const [openLogId, setOpenLogId] = useState(null)
  const [repliesByLog, setRepliesByLog] = useState({})
  const [threadLoading, setThreadLoading] = useState(false)
  const [replyBody, setReplyBody] = useState('')
  const [sending, setSending] = useState(false)
  const [threadError, setThreadError] = useState('')

  useEffect(() => {
    setLoading(true)
    api.logForMovie(tmdbId, mediaType)
      .then((logs) => setReviews((logs || []).filter((l) => l.review && l.review.trim())))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [tmdbId, mediaType])

  const bumpCount = (logId, delta) =>
    setReviews((rs) =>
      rs.map((r) =>
        r.id === logId ? { ...r, reply_count: Math.max(0, (r.reply_count || 0) + delta) } : r
      )
    )

  const toggleLike = async (log) => {
    if (!user) {
      setShowAuth(true)
      return
    }
    const prev = { liked_by_me: log.liked_by_me, like_count: log.like_count }
    setReviews((rs) =>
      rs.map((r) =>
        r.id === log.id
          ? { ...r, liked_by_me: !r.liked_by_me, like_count: r.like_count + (r.liked_by_me ? -1 : 1) }
          : r
      )
    )
    try {
      const res = await api.logToggleLike(log.id)
      setReviews((rs) =>
        rs.map((r) => (r.id === log.id ? { ...r, liked_by_me: res.liked, like_count: res.like_count } : r))
      )
    } catch {
      setReviews((rs) => rs.map((r) => (r.id === log.id ? { ...r, ...prev } : r)))
    }
  }

  const toggleThread = (logId) => {
    setThreadError('')
    setReplyBody('')
    if (openLogId === logId) {
      setOpenLogId(null)
      return
    }
    setOpenLogId(logId)
    setThreadLoading(true)
    api.reviewReplies(logId)
      .then((data) => setRepliesByLog((m) => ({ ...m, [logId]: Array.isArray(data) ? data : [] })))
      .catch((err) => {
        setRepliesByLog((m) => ({ ...m, [logId]: m[logId] || [] }))
        setThreadError(errText(err, 'Could not load replies'))
      })
      .finally(() => setThreadLoading(false))
  }

  const submitReply = async (e, logId) => {
    e.preventDefault()
    const text = replyBody.trim()
    if (!text || sending) return
    setSending(true)
    setThreadError('')
    try {
      const created = await api.reviewReplyCreate(logId, text)
      setRepliesByLog((m) => ({ ...m, [logId]: [...(m[logId] || []), created] }))
      setReplyBody('')
      bumpCount(logId, 1)
    } catch (err) {
      setThreadError(errText(err, 'Could not post your reply'))
    } finally {
      setSending(false)
    }
  }

  const removeReply = async (logId, reply) => {
    try {
      await api.reviewReplyDelete(logId, reply.id)
      setRepliesByLog((m) => ({ ...m, [logId]: (m[logId] || []).filter((r) => r.id !== reply.id) }))
      bumpCount(logId, -1)
    } catch (err) {
      setThreadError(errText(err, 'Could not delete that reply'))
    }
  }

  const toggleReplyLike = async (logId, reply) => {
    if (!user) {
      setShowAuth(true)
      return
    }
    const prev = { liked_by_me: reply.liked_by_me, like_count: reply.like_count }
    setRepliesByLog((m) => ({
      ...m,
      [logId]: (m[logId] || []).map((r) =>
        r.id === reply.id
          ? { ...r, liked_by_me: !r.liked_by_me, like_count: (r.like_count || 0) + (r.liked_by_me ? -1 : 1) }
          : r
      ),
    }))
    try {
      const res = await api.reviewReplyToggleLike(logId, reply.id)
      setRepliesByLog((m) => ({
        ...m,
        [logId]: (m[logId] || []).map((r) =>
          r.id === reply.id ? { ...r, liked_by_me: res.liked, like_count: res.like_count } : r
        ),
      }))
    } catch {
      setRepliesByLog((m) => ({
        ...m,
        [logId]: (m[logId] || []).map((r) => (r.id === reply.id ? { ...r, ...prev } : r)),
      }))
    }
  }

  if (loading) return null
  if (reviews.length === 0) return null

  return (
    <section className="md-section reviews-section">
      <h2 className="md-section-title">
        Community reviews <span className="reviews-section__count">({reviews.length})</span>
      </h2>

      <div className="reviews-list">
        {reviews.map((log) => (
          <article key={log.id} className="review-card">
            <Link to={`/user/${log.username}`} className="review-card__user">
              <Avatar name={log.display_name} url={log.avatar_url} />
              <span className="review-card__name">{log.display_name}</span>
            </Link>

            <div className="review-card__body">
              {log.rating != null && <StarRating value={Number(log.rating)} readonly size="sm" />}
              <p className="review-card__text">{log.review}</p>
              <div className="review-card__foot">
                <span className="review-card__date">{log.watched_date}</span>
                <div className="review-card__actions">
                  <button
                    className={`reply-toggle${openLogId === log.id ? ' reply-toggle--open' : ''}`}
                    onClick={() => toggleThread(log.id)}
                    aria-expanded={openLogId === log.id}
                    aria-label="Reply to review"
                  >
                    <Icon name="chat" size={14} />
                    <span>{log.reply_count > 0 ? `Reply (${log.reply_count})` : 'Reply'}</span>
                  </button>
                  <button
                    className={`like-btn${log.liked_by_me ? ' like-btn--active' : ''}`}
                    onClick={() => toggleLike(log)}
                    title={user ? 'Like this review' : 'Sign in to like'}
                    aria-label="Like review"
                  >
                    <svg viewBox="0 0 24 24" width="15" height="15" fill={log.liked_by_me ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                    <span>{log.like_count || 0}</span>
                  </button>
                </div>
              </div>

              {openLogId === log.id && (
                <div className="review-thread">
                  {threadLoading && [0, 1].map((i) => (
                    <div key={i} className="rr-item" aria-hidden="true">
                      <div className="skeleton skeleton-line short" />
                    </div>
                  ))}

                  {!threadLoading && (repliesByLog[log.id] || []).length === 0 && !threadError && (
                    <p className="rr-empty">No replies yet.</p>
                  )}

                  {!threadLoading && (repliesByLog[log.id] || []).map((reply) => (
                    <div key={reply.id} className="rr-item">
                      <Avatar
                        name={reply.user?.display_name || reply.user?.username}
                        url={reply.user?.avatar_url}
                        size={26}
                      />
                      <div className="rr-body">
                        <div className="rr-meta">
                          <Link to={`/user/${reply.user?.username}`} className="rr-name">
                            {reply.user?.username}
                          </Link>
                          <span className="rr-time">{formatTime(reply.created_at)}</span>
                          <button
                            className={`rr-like${reply.liked_by_me ? ' rr-like--active' : ''}`}
                            onClick={() => toggleReplyLike(log.id, reply)}
                            title={user ? 'Like this reply' : 'Sign in to like'}
                            aria-label="Like reply"
                          >
                            <svg viewBox="0 0 24 24" width="12" height="12" fill={reply.liked_by_me ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                            </svg>
                            <span>{reply.like_count || 0}</span>
                          </button>
                          {user && reply.user?.username === user.username && (
                            <button
                              className="cc-del"
                              onClick={() => removeReply(log.id, reply)}
                              aria-label="Delete reply"
                            >
                              <Icon name="trash" size={12} />
                            </button>
                          )}
                        </div>
                        <p className="rr-text">{reply.body}</p>
                      </div>
                    </div>
                  ))}

                  {threadError && <p className="form-error">{threadError}</p>}

                  {user ? (
                    <form className="rr-form" onSubmit={(e) => submitReply(e, log.id)}>
                      <input
                        className="rr-input"
                        value={replyBody}
                        onChange={(e) => setReplyBody(e.target.value)}
                        placeholder="Write a reply…"
                        maxLength={2000}
                        aria-label="Write a reply"
                      />
                      <button
                        type="submit"
                        className="btn btn--sm rr-send"
                        disabled={!replyBody.trim() || sending}
                      >
                        {sending ? '…' : 'Reply'}
                      </button>
                    </form>
                  ) : (
                    <div className="rr-guest">
                      <button type="button" className="cc-guest-link" onClick={() => setShowAuth(true)}>
                        Sign in
                      </button>{' '}
                      to reply.
                    </div>
                  )}
                </div>
              )}
            </div>
          </article>
        ))}
      </div>

      <AuthPrompt open={showAuth} onClose={() => setShowAuth(false)} />
    </section>
  )
}
