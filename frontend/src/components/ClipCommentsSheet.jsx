import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import Icon from './Icon'
import AuthPrompt from './AuthPrompt'

function formatTime(dateString) {
  const date = new Date(dateString)
  const diff = Math.floor((Date.now() - date.getTime()) / 1000)
  if (diff < 60) return 'now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
}

export default function ClipCommentsSheet({ clip, user, onClose, onCountChange }) {
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [closing, setClosing] = useState(false)
  const [error, setError] = useState('')
  const [dragDy, setDragDy] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const dragRef = useRef({ startY: 0, dy: 0, active: false })
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  const close = () => {
    if (closing) return
    setClosing(true)
    setTimeout(() => onCloseRef.current(), 170)
  }

  useEffect(() => {
    let alive = true
    api.clipComments(clip.id)
      .then((data) => {
        if (!alive) return
        setComments(Array.isArray(data) ? data : data.results || [])
        setLoading(false)
      })
      .catch(() => {
        if (!alive) return
        setError('Could not load comments')
        setLoading(false)
      })
    return () => { alive = false }
  }, [clip.id])

  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onGrabDown = (e) => {
    dragRef.current = { startY: e.clientY, dy: 0, active: true }
    setDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onGrabMove = (e) => {
    if (!dragRef.current.active) return
    const dy = Math.max(0, e.clientY - dragRef.current.startY)
    dragRef.current.dy = dy
    setDragDy(dy)
  }
  const onGrabUp = () => {
    const { dy } = dragRef.current
    dragRef.current.active = false
    setDragging(false)
    if (dy > 72) {
      setDragDy(0)
      close()
    } else {
      setDragDy(0)
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    const text = body.trim()
    if (!text || sending) return
    setSending(true)
    setError('')
    try {
      const created = await api.clipCommentCreate(clip.id, text)
      setComments((cs) => [...cs, created])
      setBody('')
      onCountChange?.(1)
    } catch {
      setError('Could not post your comment')
    } finally {
      setSending(false)
    }
  }

  const remove = async (comment) => {
    try {
      await api.clipCommentDelete(clip.id, comment.id)
      setComments((cs) => cs.filter((c) => c.id !== comment.id))
      onCountChange?.(-1)
    } catch {
      setError('Could not delete that comment')
    }
  }

  return (
    <>
      <div className="cc-backdrop" onClick={close} />
      <div
        className={`cc-sheet${closing ? ' closing' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Comments"
        style={{
          transform: dragDy ? `translateY(${dragDy}px)` : undefined,
          transition: dragging ? 'none' : 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div
          className="cc-grab"
          onPointerDown={onGrabDown}
          onPointerMove={onGrabMove}
          onPointerUp={onGrabUp}
          onPointerCancel={onGrabUp}
        >
          <span className="cc-handle" />
        </div>
        <div className="cc-head">
          <span className="cc-title">
            Comments{comments.length > 0 ? ` · ${comments.length}` : ''}
          </span>
          <button className="cc-close" onClick={close} aria-label="Close comments">
            <Icon name="x" size={16} />
          </button>
        </div>

        <div className="cc-list">
          {loading && [0, 1, 2].map((i) => (
            <div key={i} className="cc-item" aria-hidden="true">
              <div className="skeleton cc-avatar-sk" />
              <div className="cc-body-col">
                <div className="skeleton skeleton-line short" />
                <div className="skeleton skeleton-line" style={{ marginTop: 8, width: '70%' }} />
              </div>
            </div>
          ))}

          {!loading && comments.length === 0 && (
            <div className="cc-empty">
              <Icon name="chat" size={26} />
              <p>No comments yet</p>
              <span>Be the first to say something.</span>
            </div>
          )}

          {!loading && comments.map((c) => (
            <div key={c.id} className="cc-item">
              <div className="cc-avatar">
                {c.user?.avatar_url ? (
                  <img src={c.user.avatar_url} alt="" />
                ) : (
                  <Icon name="user" size={15} />
                )}
              </div>
              <div className="cc-body-col">
                <div className="cc-meta">
                  <span className="cc-name">{c.user?.display_name || c.user?.username}</span>
                  <span className="cc-time">{formatTime(c.created_at)}</span>
                  {user && c.user?.username === user.username && (
                    <button className="cc-del" onClick={() => remove(c)} aria-label="Delete comment">
                      <Icon name="x" size={12} />
                    </button>
                  )}
                </div>
                <p className="cc-text">{c.body}</p>
              </div>
            </div>
          ))}
        </div>

        {error && <p className="cc-error">{error}</p>}

        {user ? (
          <form className="cc-form" onSubmit={submit}>
            <input
              className="cc-input"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Add a comment…"
              maxLength={2000}
              aria-label="Add a comment"
            />
            <button
              type="submit"
              className="cc-send"
              disabled={!body.trim() || sending}
              aria-label="Post comment"
            >
              <Icon name="arrowRight" size={16} />
            </button>
          </form>
        ) : (
          <div className="cc-guest">
            <button type="button" className="cc-guest-link" onClick={() => setShowAuth(true)}>
              Sign in
            </button>{' '}
            to join the conversation.
          </div>
        )}
      </div>

      <AuthPrompt open={showAuth} onClose={() => setShowAuth(false)} />
    </>
  )
}
