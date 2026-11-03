import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import Icon from '../components/Icon'
import FoundingBadge from '../components/FoundingBadge'
import VipBadge from '../components/VipBadge'

function buildSocketUrl(slug) {
  const configured = import.meta.env.VITE_WS_BASE
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const base = configured
    ? configured.replace(/\/$/, '')
    : import.meta.env.DEV
      ? 'ws://localhost:8001'
      : `${protocol}//${window.location.host}`
  const token = localStorage.getItem('madflix_token')
  const query = token ? `?token=${encodeURIComponent(token)}` : ''
  return `${base}/ws/chat/community/${slug}/${query}`
}

function formatTime(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function GroupChatPanel({ slug, onBack }) {
  const { user } = useAuth()
  const [detail, setDetail] = useState(null)
  const [messages, setMessages] = useState([])
  const [status, setStatus] = useState('connecting')
  const [draft, setDraft] = useState('')
  const [aboutOpen, setAboutOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [suggest, setSuggest] = useState(null)
  const [selectedMovie, setSelectedMovie] = useState(null)
  const inputRef = useRef(null)
  const searchTimer = useRef(null)
  const socketRef = useRef(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    let active = true
    api.communityDetail(slug)
      .then((data) => { if (active) setDetail(data) })
      .catch(() => {})
    api.communityMessages(slug)
      .then((data) => {
        if (!active) return
        const results = Array.isArray(data?.results) ? data.results : []
        setMessages(results.map((item) => ({ ...item, sender_username: item.username })))
      })
      .catch(() => {})
    return () => { active = false }
  }, [slug])

  useEffect(() => {
    let disposed = false
    let reconnectTimer = null

    function connect() {
      if (disposed) return
      const socket = new WebSocket(buildSocketUrl(slug))
      socketRef.current = socket
      socket.onopen = () => setStatus('open')
      socket.onerror = () => setStatus('error')
      socket.onclose = () => {
        if (disposed) return
        setStatus('closed')
        reconnectTimer = setTimeout(() => {
          if (disposed) return
          setStatus('connecting')
          connect()
        }, 3000)
      }
      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data)
          setMessages((prev) => [...prev, payload])
        } catch {
          // ignore malformed frames
        }
      }
    }

    connect()
    return () => {
      disposed = true
      clearTimeout(reconnectTimer)
      if (socketRef.current) socketRef.current.close()
      socketRef.current = null
    }
  }, [slug])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages])

  function detectTag(text, caret) {
    const before = text.slice(0, caret)
    const atIndex = before.lastIndexOf('@')
    const bangIndex = before.lastIndexOf('!')
    const index = Math.max(atIndex, bangIndex)
    if (index < 0) return null
    if (index > 0 && !/\s/.test(before[index - 1])) return null
    const kind = before[index] === '@' ? 'mention' : 'movie'
    const query = before.slice(index + 1)
    if (kind === 'mention' && /\s/.test(query)) return null
    return { kind, query, start: index, end: caret }
  }

  function updateSuggestions(value, caret) {
    setDraft(value)
    const tag = detectTag(value, caret)
    if (!tag) {
      setSuggest(null)
      return
    }

    if (tag.kind === 'mention') {
      const needle = tag.query.toLowerCase()
      const items = (detail?.members || [])
        .filter((member) => (
          (member.username || '').toLowerCase().includes(needle)
          || (member.display_name || '').toLowerCase().includes(needle)
        ))
        .slice(0, 8)
      setSuggest({ ...tag, items, loading: false, index: 0 })
      return
    }

    if (!tag.query.trim()) {
      setSuggest({ ...tag, items: [], loading: false, index: 0 })
      return
    }

    setSuggest({ ...tag, items: [], loading: true, index: 0 })
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      api.multiSearch(tag.query.trim())
        .then((data) => {
          const items = (data.results || [])
            .filter((item) => item.media_type === 'movie' || item.media_type === 'tv')
            .slice(0, 8)
          setSuggest((prev) => (prev && prev.start === tag.start ? { ...prev, items, loading: false } : prev))
        })
        .catch(() => {
          setSuggest((prev) => (prev && prev.start === tag.start ? { ...prev, items: [], loading: false } : prev))
        })
    }, 250)
  }

  function applySuggestion(item) {
    if (!suggest) return
    const label = item.title || item.name || ''
    const token = suggest.kind === 'mention' ? `@${item.username} ` : `!${label} `
    const next = draft.slice(0, suggest.start) + token + draft.slice(suggest.end)
    setDraft(next)
    if (suggest.kind === 'movie') {
      setSelectedMovie({
        tmdb_id: item.id,
        media_type: item.media_type === 'tv' ? 'tv' : 'movie',
        title: label,
      })
    }
    setSuggest(null)
    requestAnimationFrame(() => {
      const caret = suggest.start + token.length
      inputRef.current?.focus()
      inputRef.current?.setSelectionRange(caret, caret)
    })
  }

  function handleComposerKey(event) {
    if (!suggest) return
    if (event.key === 'ArrowDown' && suggest.items.length > 0) {
      event.preventDefault()
      setSuggest((prev) => ({ ...prev, index: (prev.index + 1) % prev.items.length }))
    } else if (event.key === 'ArrowUp' && suggest.items.length > 0) {
      event.preventDefault()
      setSuggest((prev) => ({ ...prev, index: (prev.index - 1 + prev.items.length) % prev.items.length }))
    } else if (event.key === 'Enter' && suggest.items[suggest.index]) {
      event.preventDefault()
      applySuggestion(suggest.items[suggest.index])
    } else if (event.key === 'Escape') {
      setSuggest(null)
    }
  }

  async function sendMessage(event) {
    event.preventDefault()
    const text = draft.trim()
    if (!text || !socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return

    let tmdbId = selectedMovie?.tmdb_id ?? null
    let mediaType = selectedMovie?.media_type || 'movie'
    if (!selectedMovie) {
      const match = text.match(/@movie:([^@]+)/i)
      if (match) {
        try {
          const data = await api.multiSearch(match[1].trim())
          const first = data?.results?.[0]
          if (first) {
            tmdbId = first.id
            mediaType = first.media_type === 'tv' ? 'tv' : 'movie'
          }
        } catch { /* best effort */ }
      }
    }

    socketRef.current.send(JSON.stringify({
      message: text,
      tmdb_id: tmdbId,
      media_type: mediaType,
    }))
    setDraft('')
    setSelectedMovie(null)
    setSuggest(null)
  }

  async function leaveGroup() {
    if (!window.confirm('Leave this community?')) return
    setBusy(true)
    try {
      await api.leaveCommunity(slug)
      onBack()
    } catch {
      setBusy(false)
    }
  }

  async function deleteGroup() {
    if (!window.confirm('Delete this community permanently? This cannot be undone.')) return
    setBusy(true)
    try {
      await api.deleteCommunity(slug)
      onBack()
    } catch {
      setBusy(false)
    }
  }

  async function changeCover(event) {
    const file = event.target.files?.[0]
    if (!file) return
    setBusy(true)
    try {
      const result = await api.uploadCommunityCover(slug, file)
      setDetail((prev) => ({ ...prev, cover_image: result.cover_image }))
    } catch {
      // ignore
    } finally {
      setBusy(false)
    }
  }

  const isOwner = detail?.is_owner || (detail?.owner?.id && user?.id === detail.owner.id)

  return (
    <div className="group-chat">
      <div className="group-chat__head">
        <button
          type="button"
          className="group-chat__back"
          onClick={onBack}
          aria-label="Back to groups"
        >
          <Icon name="chevronLeft" size={18} />
        </button>
        <button
          type="button"
          className="group-chat__title-btn"
          onClick={() => setAboutOpen(true)}
        >
          <span className="group-chat__avatar">
            {detail?.cover_image ? <img src={detail.cover_image} alt="" /> : <Icon name="globe" size={18} />}
          </span>
          <span style={{ minWidth: 0, flex: 1, textAlign: 'left' }}>
            <span className="group-chat__name">{detail?.name || slug}</span>
            <span className="group-chat__sub">{detail?.member_count || 0} members · tap for info</span>
          </span>
          <Icon name="chevronRight" size={16} />
        </button>
      </div>

      <div className="group-chat__messages">
        {messages.length === 0 && <p className="group-chat__empty">No messages yet. Say hi.</p>}
        {messages.map((message, index) => (
          <div
            key={`${message.id || message.sender_id}-${message.created_at}-${index}`}
            className={`group-chat__msg${message.sender_id === user?.id ? ' group-chat__msg--mine' : ''}`}
          >
            <div className="group-chat__msg-head">
              <span>
                {message.sender_id === user?.id ? 'You' : message.sender_username}
                {message.sender_is_founding_member && <FoundingBadge size={10} />}
                {message.sender_is_vip && <VipBadge size={9} />}
              </span>
              <em>{formatTime(message.created_at)}</em>
            </div>
            <p>{message.message}</p>
            {message.tmdb_id && (
              <Link
                to={`/${message.media_type === 'tv' ? 'show' : 'movie'}/${message.tmdb_id}`}
                className="candidate-pill candidate-pill--accent"
                style={{ marginTop: 5 }}
              >
                {message.media_type === 'tv' ? 'TV' : 'Movie'} #{message.tmdb_id}
              </Link>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {suggest && (suggest.items.length > 0 || suggest.loading) && (
        <div className="group-chat__suggest">
          {suggest.loading && <div className="group-chat__suggest-empty">Searching movies…</div>}
          {suggest.items.map((item, index) => (
            <button
              key={suggest.kind === 'mention' ? item.username : item.id}
              type="button"
              className={`group-chat__suggest-item${index === suggest.index ? ' is-active' : ''}`}
              onMouseDown={(event) => {
                event.preventDefault()
                applySuggestion(item)
              }}
            >
              {suggest.kind === 'mention' ? (
                item.avatar_url ? (
                  <img src={item.avatar_url} alt="" />
                ) : (
                  <span className="group-chat__suggest-initial">
                    {(item.display_name || item.username || '?').charAt(0).toUpperCase()}
                  </span>
                )
              ) : (
                item.poster_path ? (
                  <img src={`https://image.tmdb.org/t/p/w92${item.poster_path}`} alt="" />
                ) : (
                  <span className="group-chat__suggest-initial">🎬</span>
                )
              )}
              <span style={{ minWidth: 0 }}>
                <strong>{suggest.kind === 'mention' ? item.display_name || item.username : (item.title || item.name)}</strong>
                <em>
                  {suggest.kind === 'mention'
                    ? `@${item.username}`
                    : `${item.media_type === 'tv' ? 'TV' : 'Movie'} · ${(item.release_date || item.first_air_date || '').slice(0, 4)}`}
                </em>
              </span>
            </button>
          ))}
        </div>
      )}

      {selectedMovie && (
        <div className="group-chat__tag">
          <Icon name="film" size={13} />
          {selectedMovie.title}
          <button type="button" onClick={() => setSelectedMovie(null)} aria-label="Remove movie tag">×</button>
        </div>
      )}

      <form className="group-chat__form" onSubmit={sendMessage}>
        <input
          ref={inputRef}
          className="auth-input"
          value={draft}
          onChange={(event) => updateSuggestions(event.target.value, event.target.selectionStart)}
          onKeyDown={handleComposerKey}
          placeholder="Message… @ to tag people, ! to tag a movie or show"
          aria-label="Message"
        />
        <button type="submit" className="btn btn--accent" disabled={!draft.trim() || status !== 'open'}>
          Send
        </button>
      </form>

      {aboutOpen && (
        <div className="modal-backdrop" onClick={() => setAboutOpen(false)}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            style={{ width: 'min(520px, 100%)', padding: 0, overflow: 'hidden' }}
            onClick={(event) => event.stopPropagation()}
          >
            <button type="button" className="modal-close" onClick={() => setAboutOpen(false)} aria-label="Close">×</button>
            {detail?.cover_image ? (
              <div className="community-detail__cover">
                <img src={detail.cover_image} alt="" />
              </div>
            ) : (
              <div className="community-detail__cover community-card__cover--empty">
                <Icon name="globe" size={30} />
              </div>
            )}
            <div style={{ padding: 22, display: 'grid', gap: 12 }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{detail?.name || slug}</h2>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.76rem' }}>
                {detail?.genre_tag} · {detail?.member_count || 0} members
                {detail?.owner?.username ? ` · Admin @${detail.owner.username}` : ''}
              </div>
              <p style={{ color: 'var(--text-soft)', fontSize: '0.86rem', lineHeight: 1.55 }}>
                {detail?.description || 'No description yet.'}
              </p>

              {detail?.members?.length > 0 && (
                <div>
                  <div className="profile-edit__label">Members</div>
                  <div className="community-detail__members">
                    {detail.members.slice(0, 12).map((member) => (
                      <Link key={member.username} to={`/user/${member.username}`} className="community-detail__member">
                        {member.avatar_url ? (
                          <img src={member.avatar_url} alt="" />
                        ) : (
                          <span>{(member.display_name || member.username || '?').charAt(0).toUpperCase()}</span>
                        )}
                        <em>{member.is_owner ? 'Admin' : member.display_name || member.username}</em>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {isOwner ? (
                <>
                  <label className="btn btn-ghost btn--sm" htmlFor="group-cover-input">
                    Change cover image
                  </label>
                  <input
                    id="group-cover-input"
                    type="file"
                    accept="image/*"
                    className="avatar-upload__input"
                    onChange={changeCover}
                  />
                  <button type="button" className="btn btn--danger btn--full" onClick={deleteGroup} disabled={busy}>
                    Delete community
                  </button>
                </>
              ) : (
                <button type="button" className="btn btn--danger btn--full" onClick={leaveGroup} disabled={busy}>
                  Leave community
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
