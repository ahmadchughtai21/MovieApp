import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import Icon from '../components/Icon'
import GroupChatPanel from '../components/GroupChatPanel'
import FoundingBadge from '../components/FoundingBadge'
import VipBadge from '../components/VipBadge'

function buildSocketUrl(roomName) {
  const configured = import.meta.env.VITE_WS_BASE
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const base = configured
    ? configured.replace(/\/$/, '')
    : import.meta.env.DEV
      ? 'ws://localhost:8001'
      : `${protocol}//${window.location.host}`
  const token = localStorage.getItem('madflix_token')
  const query = token ? `?token=${encodeURIComponent(token)}` : ''
  return `${base}/ws/chat/${roomName}/${query}`
}

function formatTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function timeAgo(value) {
  if (!value) return ''
  const diff = Math.floor((Date.now() - new Date(value).getTime()) / 1000)
  if (diff < 60) return 'now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d`
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function avatarInitial(name) {
  return (name || '?').charAt(0).toUpperCase()
}

function mediaLink(tmdbId, mediaType) {
  const prefix = mediaType === 'tv' ? 'show' : 'movie'
  return `/${prefix}/${tmdbId}`
}

export default function DirectMessagesPage() {
  useDocumentTitle('Messages')
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const groupSlug = searchParams.get('group')

  const [contacts, setContacts] = useState([])
  const [groups, setGroups] = useState([])
  const [tab, setTab] = useState('direct')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [active, setActive] = useState(null)
  const [messages, setMessages] = useState([])
  const [status, setStatus] = useState('idle')
  const [draft, setDraft] = useState('')
  const [replyTarget, setReplyTarget] = useState(null)
  const touchStartRef = useRef(null)
  const socketRef = useRef(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    Promise.allSettled([api.socialFollowers(), api.myGroups()])
      .then(([contactsResult, groupsResult]) => {
        if (cancelled) return
        setContacts(
          contactsResult.status === 'fulfilled' && Array.isArray(contactsResult.value)
            ? contactsResult.value
            : []
        )
        setGroups(
          groupsResult.status === 'fulfilled' && Array.isArray(groupsResult.value)
            ? groupsResult.value
            : []
        )
      })
      .catch(() => {
        if (!cancelled) setError('Could not load your messages.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!active || !user) return undefined
    const roomName = `dm_${user.id}_${active.id}`
    let disposed = false
    let reconnectTimer = null

    function connect() {
      if (disposed) return
      const socket = new WebSocket(buildSocketUrl(roomName))
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
  }, [active, user])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages])

  function openConversation(contact) {
    setMessages([])
    setDraft('')
    setStatus('connecting')
    setActive(contact)
    api.dmConversation(contact.id)
      .then((history) => {
        if (Array.isArray(history)) setMessages(history)
      })
      .catch(() => setMessages([]))
  }

  function closeConversation() {
    setActive(null)
    setMessages([])
    setDraft('')
    setStatus('idle')
    api.socialFollowers()
      .then((data) => setContacts(Array.isArray(data) ? data : []))
      .catch(() => {})
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
    if (active?.can_message === false) return
    const text = draft.trim()
    if (!text || !socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return

    const tag = await resolveMovieTag(text)
    socketRef.current.send(JSON.stringify({
      message: text,
      tmdb_id: tag.tmdb_id,
      media_type: tag.media_type,
      reply_to_id: replyTarget?.id || null,
    }))
    setDraft('')
    setReplyTarget(null)
  }

  if (!user) {
    return (
      <div className="page messages-guest" style={{ maxWidth: 560, margin: '0 auto', width: '100%' }}>
        <div className="page-head">
          <h1>Messages</h1>
          <p className="page-sub">Your groups and direct conversations.</p>
        </div>

        <div className="dm-empty messages-guest__card">
          <span className="messages-guest__icon"><Icon name="chat" size={28} /></span>
          <strong>Sign in to your inbox</strong>
          <span>
            Chat with your CineSwipe matches, join community groups, and keep every
            movie conversation in one place.
          </span>
          <div className="messages-guest__perks">
            <span><Icon name="users" size={14} /> Direct messages</span>
            <span><Icon name="globe" size={14} /> Community groups</span>
          </div>
          <div className="messages-guest__actions">
            <Link to="/login" className="btn btn--accent">Sign in</Link>
            <Link to="/register" className="btn btn--ghost">Create account</Link>
          </div>
        </div>
      </div>
    )
  }

  if (groupSlug) {
    return (
      <div className="page dm-chat-page">
        <GroupChatPanel slug={groupSlug} onBack={() => navigate('/messages')} />
      </div>
    )
  }

  if (!active) {
    return (
      <div className="page" style={{ maxWidth: 720, margin: '0 auto', width: '100%' }}>
        <div className="page-head">
          <h1>Messages</h1>
          <p className="page-sub">Your groups and direct conversations.</p>
        </div>

        <div className="discover-tabs" style={{ alignSelf: 'flex-start' }}>
          <button
            type="button"
            className={`discover-tab${tab === 'direct' ? ' discover-tab--active' : ''}`}
            onClick={() => setTab('direct')}
          >
            Direct
          </button>
          <button
            type="button"
            className={`discover-tab${tab === 'groups' ? ' discover-tab--active' : ''}`}
            onClick={() => setTab('groups')}
          >
            Groups{groups.length > 0 ? ` (${groups.length})` : ''}
          </button>
        </div>

        {tab === 'groups' ? (
          groups.length === 0 ? (
            <div className="dm-empty">
              <Icon name="globe" size={26} />
              <strong>No groups yet</strong>
              <span>Join a community and it will show up here.</span>
              <Link to="/communities" className="btn btn--accent btn--sm">Browse communities</Link>
            </div>
          ) : (
            <div className="dm-list">
              {groups.map((group) => (
                <Link key={group.slug} to={`/messages?group=${group.slug}`} className="dm-item">
                  <span className="dm-avatar dm-avatar--group">
                    {group.cover_image ? <img src={group.cover_image} alt="" /> : <Icon name="globe" size={20} />}
                  </span>
                  <span className="dm-body">
                    <span className="dm-row">
                      <strong>{group.name}</strong>
                      <span className="dm-time">{timeAgo(group.last_message_at)}</span>
                    </span>
                    <span className="dm-meta">
                      {group.member_count} members
                      {group.owner?.username ? ` · Admin @${group.owner.username}` : ''}
                    </span>
                    <span className="dm-snippet">
                      {group.last_message
                        ? `${group.last_sender ? `${group.last_sender}: ` : ''}${group.last_message}`
                        : 'No messages yet'}
                    </span>
                  </span>
                  <Icon name="chevronRight" size={16} />
                </Link>
              ))}
            </div>
          )
        ) : (
          <>
            {error && <div className="auth-error">{error}</div>}

            {loading ? (
              <div className="dm-loading">
                <span className="skeleton skeleton-line long" />
                <span className="skeleton skeleton-line medium" />
                <span className="skeleton skeleton-line long" />
              </div>
            ) : contacts.length === 0 ? (
              <div className="dm-empty">
                <Icon name="chat" size={26} />
                <strong>No conversations yet</strong>
                <span>Swipe right on CineSwipe, then chat once they accept your friend request.</span>
              </div>
            ) : (
              <div className="dm-list">
                {contacts.map((contact) => (
                  <button key={contact.id} type="button" onClick={() => openConversation(contact)} className="dm-item">
                    {contact.avatar_url ? (
                      <img className="dm-avatar" src={contact.avatar_url} alt="" />
                    ) : (
                      <span className="dm-avatar dm-avatar--initial">{avatarInitial(contact.username)}</span>
                    )}
                    <span className="dm-body">
                      <span className="dm-row">
                        <strong>
                          {contact.username}
                          {contact.is_founding_member && <FoundingBadge size={10} />}
                          {contact.is_vip && <VipBadge size={9} />}
                        </strong>
                        <span className="dm-time">{timeAgo(contact.last_message_at)}</span>
                      </span>
                      <span className="dm-meta">
                        <span className="dm-match">{contact.match_percentage}% match</span>
                        {contact.can_message === false && (
                          <span className="dm-locked"><Icon name="lock" size={10} /> Read only</span>
                        )}
                        <span className="dm-snippet">{contact.last_message || 'Start a conversation'}</span>
                      </span>
                    </span>
                    {contact.unread_count > 0 && (
                      <span className="dm-unread">{contact.unread_count > 9 ? '9+' : contact.unread_count}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  return (
    <div className="page dm-chat-page">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button type="button" className="btn btn--ghost btn--sm" onClick={closeConversation}>
          ← Messages
        </button>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 5 }}>
            {active.username}
            {active.is_founding_member && <FoundingBadge size={11} />}
            {active.is_vip && <VipBadge size={10} />}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
            {status === 'open' ? 'Online' : status === 'connecting' ? 'Connecting…' : 'Offline'}
          </div>
        </div>
      </div>

      {active.can_message === false && (
        <div className="dm-readonly">
          <Icon name="lock" size={14} />
          You're no longer friends. This conversation is read-only.
        </div>
      )}

      <div className="dm-chat-shell">
        <div className="dm-chat-messages">
          {messages.length === 0 && (
            <div style={{ margin: 'auto', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No messages yet. Say hi.
            </div>
          )}
          {messages.map((message, index) => {
            const mine = message.sender_id === user.id
            return (
              <div
                key={`${message.sender_id}-${message.created_at}-${index}`}
                className={`dm-bubble${mine ? ' dm-bubble--mine' : ''}`}
                onTouchStart={(event) => { touchStartRef.current = event.touches[0].clientX }}
                onTouchMove={(event) => {
                  if (touchStartRef.current == null) return
                  if (event.touches[0].clientX - touchStartRef.current > 55) {
                    setReplyTarget(message)
                    touchStartRef.current = null
                  }
                }}
                onTouchEnd={() => { touchStartRef.current = null }}
              >
                <div className="dm-bubble__head">
                  <span>{mine ? 'You' : message.sender_username}</span>
                  <span className="dm-bubble__time">{formatTime(message.created_at)}</span>
                  <button
                    type="button"
                    className="dm-bubble__reply"
                    onClick={() => setReplyTarget(message)}
                    aria-label="Reply"
                  >
                    ↩
                  </button>
                </div>

                {message.reply_to && (
                  <div className="dm-reply-quote">
                    <strong>@{message.reply_to.username}</strong>
                    <span>{message.reply_to.message || 'Clip'}</span>
                  </div>
                )}

                {message.message && <div className="dm-bubble__text">{message.message}</div>}

                {message.clip && (
                  <Link to={`/clips/${message.clip.id}`} className="dm-clip-card">
                    {message.clip.thumbnail_url ? (
                      <img className="dm-clip-card__thumb" src={message.clip.thumbnail_url} alt="" />
                    ) : (
                      <span className="dm-clip-card__icon"><Icon name="clapper" size={18} /></span>
                    )}
                    <span className="dm-clip-card__copy">
                      <strong>{message.clip.media_title || 'Shared clip'}</strong>
                      <em>{message.clip.caption || 'Tap to watch'}</em>
                    </span>
                  </Link>
                )}

                {message.tmdb_id && (
                  <Link to={mediaLink(message.tmdb_id, message.media_type)} className="dm-bubble__tag">
                    <Icon name={message.media_type === 'tv' ? 'tv' : 'film'} size={12} />
                    {message.media_type === 'tv' ? 'TV' : 'Movie'} #{message.tmdb_id}
                  </Link>
                )}

                {mine && (
                  <div className="dm-bubble__status">{message.is_read ? 'Read' : 'Sent'}</div>
                )}
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>

        {replyTarget && (
          <div className="dm-reply-banner">
            <span>
              Replying to <strong>@{replyTarget.sender_username}</strong>
              <em>{replyTarget.message || 'Clip'}</em>
            </span>
            <button type="button" onClick={() => setReplyTarget(null)} aria-label="Cancel reply">×</button>
          </div>
        )}

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
            placeholder={active.can_message === false ? 'Chat disabled — you are no longer friends' : 'Message… use @movie:Title to tag a movie'}
            aria-label="Message"
            disabled={active.can_message === false}
          />
          <button
            type="submit"
            className="btn btn--accent"
            disabled={active.can_message === false || !draft.trim() || status !== 'open'}
          >
            Send
          </button>
        </form>
      </div>

      {status === 'closed' && (
        <div className="page-sub">Connection closed. Reopen the conversation to reconnect.</div>
      )}
    </div>
  )
}
