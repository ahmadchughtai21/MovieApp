import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import Icon from '../components/Icon'
import FoundingBadge from '../components/FoundingBadge'
import VipBadge from '../components/VipBadge'

const FALLBACK_COMMUNITIES = [
  {
    slug: 'nolan-universe',
    name: 'Nolan Universe',
    description: 'Time loops, practical effects, and IMAX obsession.',
    genre_tag: 'Sci-Fi',
    member_count: 0,
    is_member: false,
  },
  {
    slug: 'a24-horror-vault',
    name: 'A24 Horror Vault',
    description: 'Slow-burn dread, folk horror, and everything A24.',
    genre_tag: 'Horror',
    member_count: 0,
    is_member: false,
  },
  {
    slug: 'desi-cinema-club',
    name: 'Desi Cinema Club',
    description: 'Lollywood, Bollywood, and regional gems.',
    genre_tag: 'South Asian',
    member_count: 0,
    is_member: false,
  },
  {
    slug: 'criterion-corner',
    name: 'Criterion Corner',
    description: 'Classics, restorations, and arthouse deep cuts.',
    genre_tag: 'Classics',
    member_count: 0,
    is_member: false,
  },
]

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
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function mediaLink(tmdbId, mediaType) {
  const prefix = mediaType === 'tv' ? 'show' : 'movie'
  return `/${prefix}/${tmdbId}`
}

export default function CommunitiesPage() {
  useDocumentTitle('Communities')
  const navigate = useNavigate()
  const { user } = useAuth()
  const [circles, setCircles] = useState(FALLBACK_COMMUNITIES)
  const [activeSlug, setActiveSlug] = useState(
    () => new URLSearchParams(window.location.search).get('room')
  )
  const [messages, setMessages] = useState([])
  const [status, setStatus] = useState('idle')
  const [draft, setDraft] = useState('')
  const [joining, setJoining] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [createForm, setCreateForm] = useState({ name: '', about: '', genre_tag: 'General' })
  const [coverFile, setCoverFile] = useState(null)
  const [coverPreview, setCoverPreview] = useState('')
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const socketRef = useRef(null)
  const bottomRef = useRef(null)

  const active = circles.find((circle) => circle.slug === activeSlug) || null
  const activeRoomSlug = active?.slug
  const activeIsMember = Boolean(active?.is_member)

  useEffect(() => {
    let mounted = true
    api.communities()
      .then((data) => {
        if (!mounted) return
        if (Array.isArray(data) && data.length > 0) setCircles(data)
      })
      .catch(() => {})
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    if (!activeRoomSlug || !activeIsMember) return undefined

    let disposed = false
    let reconnectTimer = null
    let historyLoaded = false

    api.communityMessages(activeRoomSlug)
      .then((data) => {
        if (!mounted() || historyLoaded) return
        historyLoaded = true
        const results = Array.isArray(data?.results) ? data.results : []
        setMessages(results.map((item) => ({
          ...item,
          sender_username: item.username,
        })))
      })
      .catch(() => {})

    function mounted() {
      return !disposed
    }

    function connect() {
      if (disposed) return
      const socket = new WebSocket(buildSocketUrl(activeRoomSlug))
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
  }, [activeRoomSlug, activeIsMember])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages])

  async function openCommunity(community) {
    if (community.is_member) {
      navigate(`/messages?group=${community.slug}`)
      return
    }
    setDetailLoading(true)
    setDetail(null)
    try {
      const data = await api.communityDetail(community.slug)
      setDetail(data)
    } catch {
      setDetail(community)
    } finally {
      setDetailLoading(false)
    }
  }

  async function joinFromDetail() {
    if (!detail || joining) return
    setJoining(true)
    try {
      const result = await api.joinCommunity(detail.slug)
      setCircles((prev) => prev.map((circle) => (
        circle.slug === detail.slug
          ? { ...circle, is_member: true, member_count: result.member_count }
          : circle
      )))
      setDetail(null)
      navigate(`/messages?group=${detail.slug}`)
    } catch {
      // keep modal open
    } finally {
      setJoining(false)
    }
  }

  function closeCommunity() {
    setActiveSlug(null)
    setMessages([])
    setStatus('idle')
  }

  async function joinCommunity() {
    if (!active || joining) return
    setJoining(true)
    try {
      const result = await api.joinCommunity(active.slug)
      setCircles((prev) => prev.map((circle) => (
        circle.slug === active.slug
          ? { ...circle, is_member: true, member_count: result.member_count }
          : circle
      )))
      setStatus('connecting')
    } catch {
      // keep the join panel visible on failure
    } finally {
      setJoining(false)
    }
  }

  async function createCommunity(event) {
    event.preventDefault()
    if (creating) return
    setCreating(true)
    setCreateError('')
    try {
      const created = await api.createCommunity({
        name: createForm.name,
        about: createForm.about,
        genre_tag: createForm.genre_tag || 'General',
      }, coverFile)
      setCircles((prev) => [created, ...prev])
      setCreateOpen(false)
      setCreateForm({ name: '', about: '', genre_tag: 'General' })
      setCoverFile(null)
      setCoverPreview('')
      navigate(`/messages?group=${created.slug}`)
    } catch (err) {
      setCreateError(err?.message || 'Could not create community.')
    } finally {
      setCreating(false)
    }
  }

  async function resolveMovieTag(text) {
    const match = text.match(/@movie:([^@]+)/i)
    if (!match) return { tmdb_id: null, media_type: 'movie' }
    const title = match[1].trim()
    if (!title) return { tmdb_id: null, media_type: 'movie' }
    try {
      const data = await api.multiSearch(title)
      const first = data?.results?.[0]
      if (first) {
        return {
          tmdb_id: first.id,
          media_type: first.media_type === 'tv' ? 'tv' : 'movie',
        }
      }
    } catch {
      // tagging is best-effort
    }
    return { tmdb_id: null, media_type: 'movie' }
  }

  async function sendMessage(event) {
    event.preventDefault()
    const text = draft.trim()
    if (!text || !socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return

    const tag = await resolveMovieTag(text)
    socketRef.current.send(JSON.stringify({
      message: text,
      tmdb_id: tag.tmdb_id,
      media_type: tag.media_type,
    }))
    setDraft('')
  }

  if (!user) {
    return (
      <div className="page" style={{ maxWidth: 520, margin: '0 auto', width: '100%' }}>
        <div className="page-head">
          <h1>Communities</h1>
          <p className="page-sub">Open group chats for every kind of movie lover.</p>
        </div>
        <div className="dm-empty">
          <Icon name="globe" size={28} />
          <strong>Sign in to join communities</strong>
          <span>Create or join a community and chat about the films you love.</span>
          <Link to="/login" className="btn btn--accent btn--sm">Sign in</Link>
        </div>
      </div>
    )
  }

  if (!active) {
    return (
      <div className="page" style={{ maxWidth: 720, margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div className="page-head">
            <h1>Communities</h1>
            <p className="page-sub">Open group chats for every kind of movie lover. Join any group.</p>
          </div>
          <button
            type="button"
            className="btn btn--accent btn--sm"
            onClick={() => setCreateOpen(true)}
            style={{ flex: 'none' }}
          >
            <Icon name="plus" size={14} /> New
          </button>
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          {circles.map((community) => (
            <button
              key={community.slug}
              type="button"
              onClick={() => openCommunity(community)}
              className="community-card"
            >
              {community.cover_image ? (
                <span className="community-card__cover">
                  <img src={community.cover_image} alt="" loading="lazy" />
                </span>
              ) : (
                <span className="community-card__cover community-card__cover--empty">
                  <Icon name="globe" size={26} />
                </span>
              )}
              <span className="community-card__body">
                <span className="community-card__title-row">
                  <span className="community-card__name">
                    {community.name}
                    {community.is_member && <span className="community-card__joined">Joined</span>}
                  </span>
                  <span className="community-card__genre">{community.genre_tag}</span>
                </span>
                <span className="community-card__about">{community.description}</span>
                <span className="community-card__meta">
                  {community.member_count || 0} members
                  {community.owner?.username ? ` · Admin @${community.owner.username}` : ''}
                </span>
              </span>
            </button>
          ))}
        </div>

        {createOpen && (
          <div className="modal-backdrop" onClick={() => setCreateOpen(false)}>
            <div
              className="modal"
              role="dialog"
              aria-modal="true"
              style={{ width: 'min(480px, 100%)', padding: 24 }}
              onClick={(event) => event.stopPropagation()}
            >
              <button type="button" className="modal-close" onClick={() => setCreateOpen(false)} aria-label="Close">×</button>
              <h2 className="modal-title">Create a community</h2>
              <form onSubmit={createCommunity} style={{ display: 'grid', gap: 12 }}>
                <div className="form-group">
                  <label>Cover image</label>
                  <div className="community-cover-upload">
                    {coverPreview ? (
                      <img src={coverPreview} alt="Cover preview" />
                    ) : (
                      <span className="community-cover-upload__empty">No cover selected</span>
                    )}
                  </div>
                  <label className="btn btn-ghost btn--sm community-cover-upload__label" htmlFor="community-cover-input">
                    Upload cover
                  </label>
                  <input
                    id="community-cover-input"
                    type="file"
                    accept="image/*"
                    className="avatar-upload__input"
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (!file) return
                      if (coverPreview) URL.revokeObjectURL(coverPreview)
                      setCoverFile(file)
                      setCoverPreview(URL.createObjectURL(file))
                    }}
                  />
                  <span className="avatar-upload__hint">JPG, PNG or WebP · max 8MB</span>
                </div>

                <div className="form-group">
                  <label htmlFor="community-title">Title</label>
                  <input
                    id="community-title"
                    className="auth-input"
                    value={createForm.name}
                    onChange={(event) => setCreateForm((prev) => ({ ...prev, name: event.target.value }))}
                    maxLength={100}
                    placeholder="e.g. Villeneuve Deep Cuts"
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="community-about">About</label>
                  <textarea
                    id="community-about"
                    className="auth-input"
                    value={createForm.about}
                    onChange={(event) => setCreateForm((prev) => ({ ...prev, about: event.target.value }))}
                    rows={4}
                    maxLength={500}
                    placeholder="What is this group about?"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="community-genre">Genre</label>
                  <input
                    id="community-genre"
                    className="auth-input"
                    value={createForm.genre_tag}
                    onChange={(event) => setCreateForm((prev) => ({ ...prev, genre_tag: event.target.value }))}
                    maxLength={50}
                    placeholder="Sci-Fi, Horror, Classics…"
                  />
                </div>
                {createError && <div className="auth-error">{createError}</div>}
                <div className="modal-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => setCreateOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn--accent" disabled={creating || createForm.name.trim().length < 3}>
                    {creating ? 'Creating…' : 'Create community'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {detail && (
          <div className="modal-backdrop" onClick={() => setDetail(null)}>
            <div
              className="modal"
              role="dialog"
              aria-modal="true"
              style={{ width: 'min(520px, 100%)', padding: 0, overflow: 'hidden' }}
              onClick={(event) => event.stopPropagation()}
            >
              <button type="button" className="modal-close" onClick={() => setDetail(null)} aria-label="Close">×</button>
              {detail.cover_image ? (
                <div className="community-detail__cover">
                  <img src={detail.cover_image} alt="" />
                </div>
              ) : (
                <div className="community-detail__cover community-card__cover--empty">
                  <Icon name="globe" size={30} />
                </div>
              )}
              <div style={{ padding: 22, display: 'grid', gap: 12 }}>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{detail.name}</h2>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.76rem', marginTop: 3 }}>
                    {detail.genre_tag} · {detail.member_count || 0} members
                    {detail.owner?.username ? ` · Admin @${detail.owner.username}` : ''}
                  </div>
                </div>
                <p style={{ color: 'var(--text-soft)', fontSize: '0.86rem', lineHeight: 1.55 }}>
                  {detail.description || 'No description yet.'}
                </p>
                {detail.members?.length > 0 && (
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
                          <em>
                            {member.is_founding_member && <FoundingBadge size={9} />}
                            {member.is_vip && <VipBadge size={8} />}
                            {member.is_owner ? 'Admin' : member.display_name || member.username}
                          </em>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  className="btn btn--accent btn--full"
                  onClick={joinFromDetail}
                  disabled={joining || detailLoading}
                >
                  {joining ? 'Joining…' : 'Join community'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="page" style={{ maxWidth: 760, margin: '0 auto', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button type="button" className="btn btn--ghost btn--sm" onClick={closeCommunity}>
          ← Communities
        </button>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 800 }}>{active.name}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
            Open group · {active.member_count || 0} members
            {active.owner?.username ? ` · Admin @${active.owner.username}` : ''}
          </div>
        </div>
        {!active.is_member && (
          <button
            type="button"
            className="btn btn--accent btn--sm"
            onClick={joinCommunity}
            disabled={joining}
          >
            {joining ? 'Joining…' : 'Join group'}
          </button>
        )}
      </div>

      {!active.is_member ? (
        <div
          style={{
            display: 'grid',
            gap: 12,
            justifyItems: 'center',
            textAlign: 'center',
            padding: 44,
            background: 'var(--bg-elev)',
            border: '1px dashed var(--border)',
            borderRadius: 'var(--radius-lg)',
          }}
        >
          <span
            style={{
              display: 'grid',
              placeItems: 'center',
              width: 56,
              height: 56,
              borderRadius: 99,
              background: 'var(--accent-soft)',
              color: 'var(--accent)',
            }}
          >
            <Icon name="globe" size={24} />
          </span>
          <div style={{ fontWeight: 800 }}>Anyone can join this group</div>
          <p className="page-sub" style={{ maxWidth: 360 }}>
            {active.description}
          </p>
          <button
            type="button"
            className="btn btn--accent"
            onClick={joinCommunity}
            disabled={joining}
          >
            {joining ? 'Joining…' : 'Join group'}
          </button>
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            height: 'min(62vh, 560px)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--bg-elev)',
            overflow: 'hidden',
          }}
        >
          <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.length === 0 && (
              <div style={{ margin: 'auto', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No messages yet. Say hi.
              </div>
            )}
            {messages.map((message, index) => (
              <div
                key={`${message.id || message.sender_id}-${message.created_at}-${index}`}
                style={{
                  alignSelf: 'flex-start',
                  maxWidth: '82%',
                  padding: '8px 12px',
                  borderRadius: 12,
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
                  <span style={{ fontWeight: 700, fontSize: '0.8rem' }}>{message.sender_username}</span>
                  <span style={{ color: 'var(--text-dim)', fontSize: '0.68rem' }}>{formatTime(message.created_at)}</span>
                </div>
                <div style={{ fontSize: '0.9rem', lineHeight: 1.35 }}>{message.message}</div>
                {message.tmdb_id && (
                  <Link
                    to={mediaLink(message.tmdb_id, message.media_type)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      marginTop: 6,
                      padding: '3px 8px',
                      borderRadius: 999,
                      background: 'var(--accent-soft)',
                      color: 'var(--accent)',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                    }}
                  >
                    <Icon name={message.media_type === 'tv' ? 'tv' : 'film'} size={12} />
                    {message.media_type === 'tv' ? 'TV' : 'Movie'} #{message.tmdb_id}
                  </Link>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <form
            onSubmit={sendMessage}
            style={{
              display: 'flex',
              gap: 8,
              padding: 12,
              borderTop: '1px solid var(--border)',
              background: 'var(--bg-base)',
            }}
          >
            <input
              className="auth-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Message… use @movie:Title to tag a movie"
              aria-label="Message"
            />
            <button
              type="submit"
              className="btn btn--accent"
              disabled={!draft.trim() || status !== 'open'}
            >
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
