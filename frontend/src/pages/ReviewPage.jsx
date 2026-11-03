import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import StarRating from '../components/StarRating'
import ImdbRating from '../components/ImdbRating'
import Loading from '../components/Loading'
import ErrorState from '../components/ErrorState'
import Icon from '../components/Icon'
import FoundingBadge from '../components/FoundingBadge'
import VipBadge from '../components/VipBadge'

function timeAgo(value) {
  if (!value) return ''
  const diff = Math.floor((Date.now() - new Date(value).getTime()) / 1000)
  if (diff < 60) return 'now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d`
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function addReply(list, parentId, created) {
  if (!parentId) return [...list, created]
  return list.map((reply) => {
    if (reply.id === parentId) {
      return { ...reply, children: [...(reply.children || []), created] }
    }
    return { ...reply, children: addReply(reply.children || [], parentId, created) }
  })
}

function patchReply(list, replyId, patch) {
  return list.map((reply) => {
    if (reply.id === replyId) return { ...reply, ...patch }
    return { ...reply, children: patchReply(reply.children || [], replyId, patch) }
  })
}

function removeReply(list, replyId) {
  return list
    .filter((reply) => reply.id !== replyId)
    .map((reply) => ({ ...reply, children: removeReply(reply.children || [], replyId) }))
}

function ReplyItem({ reply, depth, user, logId, onCreated, onPatched, onDeleted }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const isMine = user && reply.user?.username === user.username

  async function submit(event) {
    event.preventDefault()
    const body = text.trim()
    if (!body || sending) return
    setSending(true)
    setError('')
    try {
      const created = await api.reviewReplyCreate(logId, body, reply.id)
      onCreated(reply.id, created)
      setText('')
      setOpen(false)
    } catch {
      setError('Could not post your reply.')
    } finally {
      setSending(false)
    }
  }

  async function like() {
    try {
      const res = await api.reviewReplyToggleLike(logId, reply.id)
      onPatched(reply.id, { liked_by_me: res.liked, like_count: res.like_count })
    } catch { /* ignore */ }
  }

  async function remove() {
    try {
      await api.reviewReplyDelete(logId, reply.id)
      onDeleted(reply.id)
    } catch { /* ignore */ }
  }

  return (
    <div className="rv-reply" style={{ marginLeft: Math.min(depth, 4) * 18 }}>
      <div className="rv-reply__head">
        {reply.user?.avatar_url ? (
          <img className="rv-avatar" src={reply.user.avatar_url} alt="" />
        ) : (
          <span className="rv-avatar rv-avatar--initial">
            {(reply.user?.display_name || reply.user?.username || '?').charAt(0).toUpperCase()}
          </span>
        )}
        <Link to={`/user/${reply.user?.username}`} className="rv-reply__name">
          {reply.user?.display_name || reply.user?.username}
          {reply.user?.is_founding_member && <FoundingBadge size={10} />}
          {reply.user?.is_vip && <VipBadge size={9} />}
        </Link>
        <span className="rv-reply__time">{timeAgo(reply.created_at)}</span>
        <button type="button" className="rv-reply__like" onClick={like} aria-label="Like reply">
          <Icon name="heart" size={12} />
          {reply.like_count || 0}
        </button>
        {isMine && (
          <button type="button" className="rv-reply__delete" onClick={remove} aria-label="Delete reply">
            <Icon name="trash" size={12} />
          </button>
        )}
      </div>
      <p className="rv-reply__text">{reply.body}</p>
      <button type="button" className="rv-reply__action" onClick={() => setOpen((value) => !value)}>
        Reply
      </button>

      {open && (
        <form className="rv-reply__form" onSubmit={submit}>
          <input
            className="auth-input"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={`Reply to ${reply.user?.username || 'this reply'}…`}
            maxLength={2000}
            autoFocus
          />
          <button type="submit" className="btn btn--accent btn--sm" disabled={!text.trim() || sending}>
            {sending ? '…' : 'Send'}
          </button>
        </form>
      )}
      {error && <p className="form-error">{error}</p>}

      {(reply.children || []).map((child) => (
        <ReplyItem
          key={child.id}
          reply={child}
          depth={depth + 1}
          user={user}
          logId={logId}
          onCreated={onCreated}
          onPatched={onPatched}
          onDeleted={onDeleted}
        />
      ))}
    </div>
  )
}

export default function ReviewPage() {
  const { logId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [log, setLog] = useState(null)
  const [media, setMedia] = useState(null)
  const [replies, setReplies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)
  const [copied, setCopied] = useState(false)

  useDocumentTitle(log?.review ? `${log.display_name}'s review` : 'Review')

  useEffect(() => {
    let active = true
    api.reviewDetail(logId)
      .then((data) => {
        if (!active) return
        setLog(data)
        setReplies(Array.isArray(data.replies) ? data.replies : [])
        const request = data.media_type === 'tv' ? api.showDetails(data.tmdb_id) : api.movieDetails(data.tmdb_id)
        request
          .then((payload) => {
            if (!active) return
            setMedia(data.media_type === 'tv' ? payload.show_details : payload.movie_details)
          })
          .catch(() => {})
      })
      .catch((err) => {
        if (active) setError(err.message || 'Review not found')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [logId])

  async function submitTopLevel(event) {
    event.preventDefault()
    const body = replyText.trim()
    if (!body || sending) return
    setSending(true)
    try {
      const created = await api.reviewReplyCreate(logId, body)
      setReplies((prev) => addReply(prev, null, created))
      setReplyText('')
    } catch {
      setError('Could not post your reply.')
    } finally {
      setSending(false)
    }
  }

  function handleCreated(parentId, created) {
    setReplies((prev) => addReply(prev, parentId, created))
  }

  function handlePatched(replyId, patch) {
    setReplies((prev) => patchReply(prev, replyId, patch))
  }

  function handleDeleted(replyId) {
    setReplies((prev) => removeReply(prev, replyId))
  }

  if (loading) return <div className="page"><Loading /></div>
  if (error || !log) return <div className="page"><ErrorState message={error || 'Review not found'} /></div>

  const title = media?.title || media?.name || ''
  const poster = media?.poster_path
  const mediaPath = log.media_type === 'tv' ? `/show/${log.tmdb_id}` : `/movie/${log.tmdb_id}`

  const mediaYear = (media?.release_date || media?.first_air_date || '').slice(0, 4)
  const backdrop = media?.backdrop_path

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // clipboard unavailable
    }
  }

  return (
    <div className="page review-page">
      <section className="review-hero">
        {backdrop && (
          <img
            className="review-hero__bg"
            src={`https://image.tmdb.org/t/p/w1280${backdrop}`}
            alt=""
            aria-hidden="true"
          />
        )}
        <span className="review-hero__shade" />
        <button type="button" className="review-hero__back" onClick={() => navigate(-1)}>
          ← Back
        </button>

        <div className="review-hero__inner">
          <Link to={mediaPath} className="review-hero__poster">
            {poster ? (
              <img src={`https://image.tmdb.org/t/p/w342${poster}`} alt={title} />
            ) : (
              <span>{title || '—'}</span>
            )}
          </Link>

          <div className="review-hero__meta">
            <span className="review-hero__kicker">Review</span>
            <Link to={mediaPath} className="review-hero__title">{title || 'Untitled'}</Link>
            <div className="review-hero__facts">
              {mediaYear && <span>{mediaYear}</span>}
              <span>{log.media_type === 'tv' ? 'TV Show' : 'Film'}</span>
              {media?.vote_average > 0 && <ImdbRating value={media.vote_average} />}
            </div>
          </div>
        </div>
      </section>

      <article className="review-sheet">
        <header className="review-sheet__author">
          {log.avatar_url ? (
            <img className="review-sheet__avatar" src={log.avatar_url} alt="" />
          ) : (
            <span className="review-sheet__avatar review-sheet__avatar--initial">
              {(log.display_name || log.username || '?').charAt(0).toUpperCase()}
            </span>
          )}
          <div style={{ minWidth: 0 }}>
            <Link to={`/user/${log.username}`} className="review-sheet__name">
              {log.is_founding_member && <FoundingBadge size={11} />}
              {log.is_vip && <VipBadge size={10} />}
              {log.display_name || log.username}
            </Link>
            <div className="review-sheet__sub">
              @{log.username}
              {log.watched_date ? ` · watched ${log.watched_date}` : ''}
            </div>
          </div>

          {log.rating != null && (
            <div className="review-sheet__score">
              <StarRating value={Number(log.rating)} readonly size="sm" />
              <span>{Number(log.rating).toFixed(1)}/5</span>
            </div>
          )}
        </header>

        <p className="review-sheet__text">{log.review}</p>

        <footer className="review-sheet__footer">
          <button
            type="button"
            className={`review-pill${log.liked_by_me ? ' review-pill--active' : ''}`}
            onClick={async () => {
              if (!user) return
              try {
                const res = await api.logToggleLike(log.id)
                setLog((prev) => ({ ...prev, liked_by_me: res.liked, like_count: res.like_count }))
              } catch { /* ignore */ }
            }}
            disabled={!user}
          >
            <Icon name="heart" size={14} />
            {log.like_count || 0} likes
          </button>
          <button type="button" className="review-pill" onClick={copyLink}>
            <Icon name="copy" size={14} />
            {copied ? 'Copied' : 'Share'}
          </button>
          <span className="review-sheet__reply-count">{replies.length} replies</span>
        </footer>
      </article>

      <section className="review-thread">
        <header className="review-thread__head">
          <h2>Replies</h2>
          <span>{replies.length}</span>
        </header>

        {replies.length === 0 && (
          <p className="review-thread__empty">No replies yet. Start the conversation.</p>
        )}

        <div className="review-thread__list">
          {replies.map((reply) => (
            <ReplyItem
              key={reply.id}
              reply={reply}
              depth={0}
              user={user}
              logId={logId}
              onCreated={handleCreated}
              onPatched={handlePatched}
              onDeleted={handleDeleted}
            />
          ))}
        </div>

        {user ? (
          <form className="review-thread__form" onSubmit={submitTopLevel}>
            <input
              className="auth-input"
              value={replyText}
              onChange={(event) => setReplyText(event.target.value)}
              placeholder={`Reply to ${log.display_name || log.username}…`}
              maxLength={2000}
            />
            <button type="submit" className="btn btn--accent" disabled={!replyText.trim() || sending}>
              {sending ? 'Sending…' : 'Reply'}
            </button>
          </form>
        ) : (
          <p className="page-sub">
            <Link to="/login">Sign in</Link> to reply.
          </p>
        )}
      </section>
    </div>
  )
}
