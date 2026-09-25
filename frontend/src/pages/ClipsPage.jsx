import { useEffect, useState, useRef } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import Icon from '../components/Icon'
import ErrorState from '../components/ErrorState'
import ClipCommentsSheet from '../components/ClipCommentsSheet'
import ClipReportModal from '../components/ClipReportModal'
import AuthPrompt from '../components/AuthPrompt'

const TAP_WINDOW = 280

const renderCaption = (text) => {
  if (!text) return null
  const out = []
  const re = /(#\w+|@\w+)/g
  let last = 0
  let m
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const tok = m[0]
    if (tok[0] === '#') {
      out.push(<span key={m.index} className="clip-hashtag">{tok}</span>)
    } else {
      out.push(
        <Link
          key={m.index}
          className="clip-mention"
          to={`/user/${tok.slice(1)}`}
          onClick={(e) => e.stopPropagation()}
        >
          {tok}
        </Link>
      )
    }
    last = m.index + tok.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

const formatCount = (n = 0) => {
  if (n >= 1e6) return `${+(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${+(n / 1e3).toFixed(1)}K`
  return String(n)
}

export default function ClipsPage() {
  const { clipId: deepClipId } = useParams()
  const { user } = useAuth()

  const [clips, setClips] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cursor, setCursor] = useState(null)
  const [hasMore, setHasMore] = useState(false)

  const [activeId, setActiveId] = useState(null)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(true)
  const [broken, setBroken] = useState({})
  const [bursts, setBursts] = useState([])

  const [commentsClip, setCommentsClip] = useState(null)
  const [showAuth, setShowAuth] = useState(false)
  const [reportClip, setReportClip] = useState(null)
  const [toast, setToast] = useState('')

  const [showUpload, setShowUpload] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [caption, setCaption] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [filePreview, setFilePreview] = useState('')
  const [fileDuration, setFileDuration] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [taggedMovie, setTaggedMovie] = useState(null)
  const [movieQuery, setMovieQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [mention, setMention] = useState(null)

  const feedRef = useRef(null)
  const fileInputRef = useRef(null)
  const captionRef = useRef(null)
  const acceptSeq = useRef(0)
  const mentionDismissed = useRef('')
  const cardRefs = useRef({})
  const videoRefs = useRef({})
  const fillRefs = useRef({})
  const observerRef = useRef(null)
  const loadingRef = useRef(false)
  const activeRef = useRef(null)
  const mutedRef = useRef(true)
  const tapRef = useRef({ time: 0, timer: null })
  const toastTimer = useRef(null)
  const deepFocused = useRef(false)
  const reducedMotion = useRef(false)

  useEffect(() => {
    reducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    return () => {
      if (filePreview) URL.revokeObjectURL(filePreview)
      if (tapRef.current.timer) clearTimeout(tapRef.current.timer)
      if (toastTimer.current) clearTimeout(toastTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const showToast = (msg) => {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2400)
  }

  const loadClips = async (reset = false) => {
    if (loadingRef.current) return
    loadingRef.current = true
    if (reset) {
      setClips([])
      setCursor(null)
      setHasMore(true)
    }
    setLoading(true)
    setError('')
    try {
      const params = { limit: 10, mode: 'for_you' }
      const curs = reset ? null : cursor
      if (curs) params.cursor = curs
      const data = await api.clips(params)
      setClips((prev) => (reset ? data.results : [...prev, ...data.results]))
      setCursor(data.next_cursor)
      setHasMore(Boolean(data.has_more))
    } catch (err) {
      setError(err.message || 'Could not load clips')
    } finally {
      loadingRef.current = false
      setLoading(false)
    }
  }

  useEffect(() => {
    loadClips()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ---------- playback: intersection-driven autoplay, one clip at a time ---------- */
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target
          const id = Number(video.dataset.clipId)
          if (entry.isIntersecting && entry.intersectionRatio >= 0.55) {
            activeRef.current = id
            setActiveId(id)
            setPlaying(true)
            const fill = fillRefs.current[id]
            if (fill) fill.style.width = '0%'
            video.muted = mutedRef.current
            const p = video.play()
            if (p && typeof p.catch === 'function') {
              p.catch(() => {
                // autoplay with sound blocked: fall back to muted
                video.muted = true
                mutedRef.current = true
                setMuted(true)
                video.play().catch(() => {
                  if (activeRef.current === id) setPlaying(false)
                })
              })
            }
          } else {
            video.pause()
            if (activeRef.current === id) setPlaying(false)
          }
        })
      },
      { threshold: [0, 0.55] }
    )
    observerRef.current = io
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    const io = observerRef.current
    if (!io) return
    Object.values(videoRefs.current).forEach((v) => v && io.unobserve(v))
    clips.forEach((c) => {
      const v = videoRefs.current[c.id]
      if (v) io.observe(v)
    })
  }, [clips])

  useEffect(() => {
    mutedRef.current = muted
    Object.values(videoRefs.current).forEach((v) => {
      if (v) v.muted = muted
    })
  }, [muted])

  /* ---------- deep link /clips/:id ---------- */
  useEffect(() => {
    if (!deepClipId || loading || clips.length === 0 || deepFocused.current) return
    deepFocused.current = true
    const target = clips.find((c) => String(c.id) === String(deepClipId))
    if (target) {
      cardRefs.current[target.id]?.scrollIntoView({ block: 'start' })
      return
    }
    let alive = true
    api
      .clipDetail(deepClipId)
      .then((detail) => {
        if (!alive) return
        setClips((prev) => (prev.some((c) => c.id === detail.id) ? prev : [detail, ...prev]))
        requestAnimationFrame(() =>
          requestAnimationFrame(() => cardRefs.current[detail.id]?.scrollIntoView({ block: 'start' }))
        )
      })
      .catch(() => {})
    return () => { alive = false }
  }, [deepClipId, loading, clips])

  /* ---------- keyboard: arrows / space / m ---------- */
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable) return
      if (e.key === 'Escape') {
        setCommentsClip(null)
        setReportClip(null)
        setShowUpload(false)
        return
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (!clips.length) return
        e.preventDefault()
        const idx = clips.findIndex((c) => c.id === activeRef.current)
        const next = Math.min(Math.max((idx === -1 ? 0 : idx) + (e.key === 'ArrowDown' ? 1 : -1), 0), clips.length - 1)
        cardRefs.current[clips[next].id]?.scrollIntoView({
          behavior: reducedMotion.current ? 'auto' : 'smooth',
          block: 'start',
        })
      } else if (e.key === ' ' || e.key === 'k') {
        if (!activeRef.current) return
        e.preventDefault()
        const v = videoRefs.current[activeRef.current]
        if (!v) return
        if (v.paused) v.play().catch(() => {})
        else v.pause()
      } else if (e.key === 'm') {
        setMuted((m) => !m)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [clips])

  /* ---------- likes ---------- */
  const applyLike = async (clip, target) => {
    if (!user) {
      setShowAuth(true)
      return
    }
    if (clip.liked_by_me === target) return
    setClips((cs) =>
      cs.map((c) =>
        c.id === clip.id
          ? { ...c, liked_by_me: target, like_count: Math.max(0, (c.like_count || 0) + (target ? 1 : -1)) }
          : c
      )
    )
    try {
      const d = await api.clipLikeToggle(clip.id)
      setClips((cs) =>
        cs.map((c) => (c.id === clip.id ? { ...c, liked_by_me: d.liked, like_count: d.likes_count } : c))
      )
    } catch {
      setClips((cs) =>
        cs.map((c) =>
          c.id === clip.id
            ? { ...c, liked_by_me: !target, like_count: Math.max(0, (c.like_count || 0) + (target ? -1 : 1)) }
            : c
        )
      )
    }
  }

  /* ---------- tap gestures: single = play/pause, double = like + heart burst ---------- */
  const spawnBurst = (clip, e) => {
    const card = cardRefs.current[clip.id]
    if (!card) return
    const r = card.getBoundingClientRect()
    const burst = {
      id: `${Date.now()}-${Math.random()}`,
      clipId: clip.id,
      x: e.clientX - r.left,
      y: e.clientY - r.top,
    }
    setBursts((b) => [...b, burst])
    setTimeout(() => setBursts((b) => b.filter((x) => x.id !== burst.id)), 950)
  }

  const handleTap = (e, clip) => {
    const now = Date.now()
    const t = tapRef.current
    if (now - t.time < TAP_WINDOW) {
      clearTimeout(t.timer)
      t.time = 0
      if (!user) {
        setShowAuth(true)
        return
      }
      spawnBurst(clip, e)
      if (!clip.liked_by_me) {
        applyLike(clip, true)
      }
    } else {
      t.time = now
      t.timer = setTimeout(() => {
        const v = videoRefs.current[clip.id]
        if (!v) return
        if (v.paused) v.play().catch(() => {})
        else v.pause()
      }, TAP_WINDOW)
    }
  }

  const handleSeek = (e, clip) => {
    const track = e.currentTarget
    const v = videoRefs.current[clip.id]
    if (!v || !v.duration) return
    const apply = (clientX) => {
      const rect = track.getBoundingClientRect()
      const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1)
      v.currentTime = ratio * v.duration
      const fill = fillRefs.current[clip.id]
      if (fill) fill.style.width = `${ratio * 100}%`
    }
    apply(e.clientX)
    try { track.setPointerCapture(e.pointerId) } catch { /* ignore */ }
    const onMove = (ev) => apply(ev.clientX)
    const onUp = () => {
      track.removeEventListener('pointermove', onMove)
      track.removeEventListener('pointerup', onUp)
      track.removeEventListener('pointercancel', onUp)
    }
    track.addEventListener('pointermove', onMove)
    track.addEventListener('pointerup', onUp)
    track.addEventListener('pointercancel', onUp)
  }

  const handleTimeUpdate = (clip, e) => {
    if (activeRef.current !== clip.id) return
    const v = e.currentTarget
    if (!v.duration) return
    const fill = fillRefs.current[clip.id]
    if (fill) fill.style.width = `${(v.currentTime / v.duration) * 100}%`
  }

  const shareClip = async (clip) => {
    const url = `${window.location.origin}/clips/${clip.id}`
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Madflix clip', url })
        return
      }
      await navigator.clipboard.writeText(url)
      showToast('Link copied')
    } catch (err) {
      if (err?.name !== 'AbortError') showToast('Could not share this clip')
    }
  }

  const handleReport = (clip) => {
    if (!user) {
      setShowAuth(true)
      return
    }
    setReportClip(clip)
  }

  const handleScroll = () => {
    const el = feedRef.current
    if (!el || !hasMore || loadingRef.current) return
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 400) loadClips()
  }

  /* ---------- upload ---------- */
  const clearFile = () => {
    acceptSeq.current++
    if (filePreview) URL.revokeObjectURL(filePreview)
    setFilePreview('')
    setSelectedFile(null)
    setFileDuration(null)
  }

  const acceptFile = (file) => {
    const seq = ++acceptSeq.current
    setUploadError('')
    const ext = file.name.split('.').pop().toLowerCase()
    if (!['mp4', 'mov', 'm4v', 'webm'].includes(ext)) {
      setUploadError('Use an MP4, MOV, M4V, or WebM file.')
      return
    }
    if (file.size > 150 * 1024 * 1024) {
      setUploadError('That file is over 150 MB. Pick a shorter clip.')
      return
    }
    const url = URL.createObjectURL(file)
    const probe = document.createElement('video')
    probe.preload = 'metadata'
    let done = false
    const commit = (duration) => {
      if (done) return
      done = true
      if (seq !== acceptSeq.current) {
        URL.revokeObjectURL(url)
        return
      }
      if (filePreview) URL.revokeObjectURL(filePreview)
      setSelectedFile(file)
      setFilePreview(url)
      setFileDuration(duration)
    }
    probe.onloadedmetadata = () => {
      const d = probe.duration
      if (isFinite(d) && d > 180) {
        done = true
        URL.revokeObjectURL(url)
        if (seq === acceptSeq.current) setUploadError('Clips are up to 3 minutes. Pick a shorter cut.')
        return
      }
      commit(isFinite(d) ? Math.round(d) : null)
    }
    probe.onerror = () => commit(null)
    probe.src = url
    setTimeout(() => commit(null), 3000)
  }

  const onFileChange = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) acceptFile(file)
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) acceptFile(file)
  }

  const fmtDuration = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  const searchMovies = async (q) => {
    setMovieQuery(q)
    if (!q.trim()) {
      setSearchResults([])
      return
    }
    setSearching(true)
    try {
      const data = await api.multiSearch(q, 1)
      const results = (data.results || [])
        .filter((r) => r.media_type === 'movie' || r.media_type === 'tv')
        .slice(0, 8)
        .map((r) => ({
          id: r.id,
          title: r.media_type === 'movie' ? r.title : r.name,
          media_type: r.media_type,
          kind: r.media_type === 'movie' ? 'Movie' : 'Series',
          year: ((r.media_type === 'movie' ? r.release_date : r.first_air_date) || '').slice(0, 4),
        }))
      setSearchResults(results)
    } catch {
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  const pickMovie = (m) => {
    setTaggedMovie(m)
    setMovieQuery('')
    setSearchResults([])
  }

  /* ---------- caption @mentions ---------- */
  useEffect(() => {
    if (!mention || !mention.query) return undefined
    const q = mention.query
    let active = true
    const timer = setTimeout(async () => {
      try {
        const users = await api.userSearch(q)
        if (active) setMention((m) => (m && m.query === q ? { ...m, users, loading: false } : m))
      } catch {
        if (active) setMention((m) => (m && m.query === q ? { ...m, users: [], loading: false } : m))
      }
    }, 250)
    return () => { active = false; clearTimeout(timer) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mention?.start, mention?.query])

  const detectMention = (el) => {
    if (!el) return
    const pos = el.selectionStart ?? 0
    const before = el.value.slice(0, pos)
    const m = before.match(/(?:^|\s)@(\w*)$/)
    if (!m) {
      mentionDismissed.current = ''
      setMention((prev) => (prev ? null : prev))
      return
    }
    const start = before.lastIndexOf('@')
    if (mentionDismissed.current === `${start}:${m[1]}`) {
      setMention((prev) => (prev ? null : prev))
      return
    }
    setMention((prev) => {
      if (prev && prev.start === start && prev.query === m[1]) return prev
      return { start, query: m[1], users: [], index: 0, loading: m[1].length > 0 }
    })
  }

  const pickMention = (u) => {
    if (!mention) return
    mentionDismissed.current = ''
    const insert = `@${u.username} `
    const afterStart = mention.start + 1 + mention.query.length
    const next = caption.slice(0, mention.start) + insert + caption.slice(afterStart)
    const caret = mention.start + insert.length
    setCaption(next)
    setMention(null)
    const el = captionRef.current
    if (el) {
      requestAnimationFrame(() => {
        el.focus()
        el.setSelectionRange(caret, caret)
      })
    }
  }

  const captionKeyDown = (e) => {
    if (!mention) return
    if (e.key === 'Escape') {
      e.preventDefault()
      if (mention) mentionDismissed.current = `${mention.start}:${mention.query}`
      setMention(null)
      return
    }
    if (!mention.users.length) return
    const n = mention.users.length
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setMention({ ...mention, index: (mention.index + 1) % n })
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setMention({ ...mention, index: (mention.index - 1 + n) % n })
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      pickMention(mention.users[mention.index])
    }
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!selectedFile || !caption.trim()) return
    setUploading(true)
    setUploadError('')
    try {
      const formData = new FormData()
      formData.append('video', selectedFile)
      formData.append('caption', caption.trim())
      if (taggedMovie) {
        formData.append('tmdb_id', taggedMovie.id)
        formData.append('media_type', taggedMovie.media_type)
        formData.append('media_title', taggedMovie.title || '')
      }
      await api.clipCreate(formData)
      setCaption('')
      clearFile()
      setTaggedMovie(null)
      setShowUpload(false)
      showToast('Clip posted')
      loadClips(true)
    } catch (err) {
      setUploadError(err.message || 'Upload failed. Check the file and try again.')
    } finally {
      setUploading(false)
    }
  }

  /* ---------- render ---------- */
  const header = (
    <div className="clips-header">
      <h1 className="clips-title">Clips</h1>
      <div className="clips-header-actions">
        <button
          className="clip-icon-btn"
          onClick={() => setMuted((m) => !m)}
          aria-label={muted ? 'Unmute clips' : 'Mute clips'}
          aria-pressed={muted}
          title={muted ? 'Unmute (m)' : 'Mute (m)'}
        >
          <Icon name={muted ? 'volumeX' : 'volume'} size={16} />
        </button>
        {user ? (
          <button className="btn btn--accent btn--sm" onClick={() => setShowUpload(true)}>
            <Icon name="clapper" size={14} /> Post Clip
          </button>
        ) : (
          <Link to="/login" className="btn btn-ghost btn--sm">Sign in</Link>
        )}
      </div>
    </div>
  )

  if (error && !clips.length) {
    return (
      <div className="page page--bleed clips-page">
        {header}
        <div className="clips-fatal">
          <ErrorState message={error} title="Clips are unavailable" />
          <button className="btn btn-outline" onClick={() => loadClips(true)}>Try again</button>
        </div>
      </div>
    )
  }

  return (
    <div className="page page--bleed clips-page">
      {header}

      <div className="clips-feed" ref={feedRef} onScroll={handleScroll} aria-label="Clips feed">
        {loading && !clips.length && (
          <div className="clip-skeleton-card" aria-hidden="true">
            <div className="clip-frame">
              <div className="skeleton clip-skeleton-fill" />
              <div className="clip-skeleton-lines">
                <div className="skeleton skeleton-line short" />
                <div className="skeleton skeleton-line" style={{ width: '65%' }} />
              </div>
            </div>
          </div>
        )}

        {clips.map((clip) => (
          <article
            key={clip.id}
            className="clip-card"
            data-clip-id={clip.id}
            ref={(el) => { cardRefs.current[clip.id] = el }}
            aria-label={`Clip by ${clip.user?.username || 'member'}`}
          >
            <div className="clip-frame">
              <video
                ref={(el) => { videoRefs.current[clip.id] = el }}
                data-clip-id={clip.id}
                src={clip.video_url}
                playsInline
                muted={muted}
                loop
                preload="metadata"
                draggable={false}
                className="clip-video"
                onPlay={() => { if (activeRef.current === clip.id) setPlaying(true) }}
                onPause={() => { if (activeRef.current === clip.id) setPlaying(false) }}
                onTimeUpdate={(e) => handleTimeUpdate(clip, e)}
                onError={() => setBroken((b) => ({ ...b, [clip.id]: true }))}
              />

              {broken[clip.id] && (
                <div className="clip-broken">
                  <Icon name="clapper" size={34} />
                  <p>This clip can’t be played right now.</p>
                </div>
              )}

              <div className="clip-tap" onClick={(e) => handleTap(e, clip)} aria-hidden="true" />

              {bursts
                .filter((b) => b.clipId === clip.id)
                .map((b) => (
                  <span key={b.id} className="clip-burst" style={{ left: b.x, top: b.y }}>
                    <Icon name="heart" size={96} fill="currentColor" />
                  </span>
                ))}

              <div className={`clip-center-fx${activeId === clip.id && !playing ? ' show' : ''}`}>
                <Icon name="play" size={64} fill="currentColor" />
              </div>

              <div className="clip-ui">
                <div className="clip-info">
                  <Link to={`/user/${clip.user.username}`} className="clip-author">
                    <span className="clip-avatar">
                      {clip.user.avatar_url ? (
                        <img src={clip.user.avatar_url} alt="" />
                      ) : (
                        <Icon name="user" size={18} />
                      )}
                    </span>
                    <span className="clip-author-meta">
                      <span className="clip-author-name">{clip.user.display_name || clip.user.username}</span>
                      <span className="clip-author-handle">@{clip.user.username}</span>
                    </span>
                  </Link>

                  {clip.caption && (
                    <p className="clip-caption">{renderCaption(clip.caption)}</p>
                  )}

                  {clip.tmdb_id && clip.media_type && (
                    <Link
                      to={`/${clip.media_type === 'movie' ? 'movie' : 'show'}/${clip.tmdb_id}`}
                      className="clip-tag"
                    >
                      <Icon name={clip.media_type === 'movie' ? 'film' : 'tv'} size={12} />
                      <span className="clip-tag-title">
                        {clip.media_title || (clip.media_type === 'movie' ? 'Movie' : 'Series')}
                      </span>
                    </Link>
                  )}
                </div>

                <div className="clip-actions">
                  <button
                    className={`clip-action${clip.liked_by_me ? ' is-liked' : ''}`}
                    onClick={() => applyLike(clip, !clip.liked_by_me)}
                    aria-label={clip.liked_by_me ? 'Unlike clip' : 'Like clip'}
                    aria-pressed={Boolean(clip.liked_by_me)}
                  >
                    <span className="clip-action-btn">
                      <Icon name="heart" size={22} fill={clip.liked_by_me ? 'currentColor' : 'none'} />
                    </span>
                    <span className="clip-action-count">{formatCount(clip.like_count)}</span>
                  </button>

                  <button
                    className="clip-action"
                    onClick={() => setCommentsClip(clip)}
                    aria-label="Comments"
                  >
                    <span className="clip-action-btn">
                      <Icon name="chat" size={21} />
                    </span>
                    <span className="clip-action-count">{formatCount(clip.comment_count)}</span>
                  </button>

                  <button
                    className="clip-action"
                    onClick={() => shareClip(clip)}
                    aria-label="Share clip"
                  >
                    <span className="clip-action-btn">
                      <Icon name="share" size={20} />
                    </span>
                  </button>

                  <button
                    className="clip-action"
                    onClick={() => handleReport(clip)}
                    aria-label="Report clip"
                  >
                    <span className="clip-action-btn">
                      <Icon name="flag" size={19} />
                    </span>
                  </button>
                </div>

                <div
                  className="clip-progress"
                  onPointerDown={(e) => handleSeek(e, clip)}
                  role="presentation"
                >
                  <div
                    className="clip-progress-fill"
                    ref={(el) => { fillRefs.current[clip.id] = el }}
                  />
                </div>
              </div>
            </div>
          </article>
        ))}

        {!loading && !clips.length && !error && (
          <div className="clips-empty">
            <span className="clips-empty-icon"><Icon name="clapper" size={34} /></span>
            <p>No clips yet</p>
            <span className="clips-empty-hint">
              {user ? 'Post the first one and it shows up here for everyone.' : 'Sign in to post the first clip.'}
            </span>
            {user ? (
              <button className="btn btn--accent" onClick={() => setShowUpload(true)}>
                <Icon name="clapper" size={15} /> Post Clip
              </button>
            ) : (
              <Link to="/login" className="btn btn--accent">Sign in</Link>
            )}
          </div>
        )}
      </div>

      {hasMore && clips.length > 0 && loading && (
        <div className="clips-more" role="status" aria-label="Loading more clips">
          <span className="clips-spinner" />
        </div>
      )}

      {toast && <div className="clip-toast" role="status">{toast}</div>}

      {commentsClip && (
        <ClipCommentsSheet
          clip={commentsClip}
          user={user}
          onClose={() => setCommentsClip(null)}
          onCountChange={(delta) =>
            setClips((cs) =>
              cs.map((c) =>
                c.id === commentsClip.id
                  ? { ...c, comment_count: Math.max(0, (c.comment_count || 0) + delta) }
                  : c
              )
            )
          }
        />
      )}

      {reportClip && (
        <ClipReportModal
          clip={reportClip}
          onClose={() => setReportClip(null)}
          onDone={() => {
            setReportClip(null)
            showToast('Report submitted. Thanks for the flag.')
          }}
        />
      )}

      <AuthPrompt open={showAuth} onClose={() => setShowAuth(false)} />

      {showUpload && (
        <div className="modal-backdrop" onClick={() => setShowUpload(false)}>
          <div className="modal clip-upload-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => setShowUpload(false)}
              aria-label="Close"
            >
              <Icon name="x" size={16} />
            </button>
            <h2 className="modal-title">Post a Clip</h2>
            <p className="clip-upload-sub">Share a moment with the community.</p>
            <form onSubmit={handleUpload} className="clip-upload-form">
              <div className="form-group">
                <label htmlFor="clip-video">Video</label>
                {!selectedFile ? (
                  <div
                    className={`clip-dropzone${dragOver ? ' drag-over' : ''}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => fileInputRef.current?.click()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        fileInputRef.current?.click()
                      }
                    }}
                    onDragOver={(e) => { e.preventDefault(); if (!uploading) setDragOver(true) }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={onDrop}
                  >
                    <Icon name="clapper" size={22} />
                    <span className="clip-dropzone-main">
                      Choose a video <span>or drag &amp; drop it here</span>
                    </span>
                    <span className="file-hint">MP4, MOV, M4V or WebM · up to 3 minutes · 150 MB max</span>
                  </div>
                ) : (
                  <div className="clip-file-card">
                    <div className="clip-file-preview">
                      <video src={filePreview} playsInline muted controls />
                      <button
                        type="button"
                        className="clip-file-remove"
                        onClick={clearFile}
                        aria-label="Remove video"
                        disabled={uploading}
                      >
                        <Icon name="x" size={14} />
                      </button>
                    </div>
                    <div className="clip-file-meta">
                      <span className="clip-file-name">{selectedFile.name}</span>
                      <span className="clip-file-stats">
                        {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                        {fileDuration != null && ` · ${fmtDuration(fileDuration)}`}
                      </span>
                      <button
                        type="button"
                        className="clip-file-change"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                      >
                        Replace
                      </button>
                    </div>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  id="clip-video"
                  type="file"
                  accept="video/mp4,video/quicktime,video/webm,video/x-m4v"
                  onChange={onFileChange}
                  disabled={uploading}
                  tabIndex={-1}
                  className="clip-file-input"
                />
              </div>

              <div className="form-group clip-search-wrap">
                <div className="form-label-row">
                  <label htmlFor="clip-caption">Caption</label>
                  <span className={`char-count${caption.length > 1800 ? ' near' : ''}`}>
                    {caption.length}/2000
                  </span>
                </div>
                <textarea
                  id="clip-caption"
                  ref={captionRef}
                  value={caption}
                  onChange={(e) => {
                    setCaption(e.target.value)
                    detectMention(e.target)
                  }}
                  onKeyUp={(e) => detectMention(e.currentTarget)}
                  onClick={(e) => detectMention(e.currentTarget)}
                  onSelect={(e) => detectMention(e.currentTarget)}
                  onKeyDown={captionKeyDown}
                  onBlur={() => setTimeout(() => setMention(null), 150)}
                  placeholder="Say something about this moment… #hashtags @mentions"
                  rows={3}
                  maxLength={2000}
                  required
                  disabled={uploading}
                />
                {mention && mention.query && (
                  <div className="clip-search-results mention-menu" role="listbox" aria-label="Mention a member">
                    {mention.loading ? (
                      <div className="mention-menu-hint">Searching members…</div>
                    ) : mention.users.length ? (
                      mention.users.map((u, i) => (
                        <button
                          type="button"
                          key={u.username}
                          role="option"
                          aria-selected={i === mention.index}
                          className={`clip-search-item${i === mention.index ? ' is-active' : ''}`}
                          onMouseDown={(e) => { e.preventDefault(); pickMention(u) }}
                          onMouseEnter={() => setMention((m) => (m ? { ...m, index: i } : m))}
                        >
                          <Icon name="user" size={14} />
                          <span>@{u.username}</span>
                          {u.display_name && u.display_name !== u.username && (
                            <span className="clip-search-kind">{u.display_name}</span>
                          )}
                        </button>
                      ))
                    ) : (
                      <div className="mention-menu-hint">No members found</div>
                    )}
                  </div>
                )}
              </div>

              <div className="form-group clip-search-wrap">
                <label htmlFor="clip-movie">Tag a movie or series (optional)</label>
                {taggedMovie ? (
                  <div className="tagged-row">
                    <span className="tagged-badge">
                      <Icon name={taggedMovie.media_type === 'movie' ? 'film' : 'tv'} size={12} />
                      {taggedMovie.title}{taggedMovie.year ? ` (${taggedMovie.year})` : ''}
                      <button
                        type="button"
                        onClick={() => setTaggedMovie(null)}
                        aria-label="Remove tag"
                        disabled={uploading}
                      >
                        <Icon name="x" size={12} />
                      </button>
                    </span>
                    <span className="file-hint">Remove the tag to search for another title.</span>
                  </div>
                ) : (
                  <>
                    <input
                      id="clip-movie"
                      type="text"
                      placeholder="Search titles…"
                      value={movieQuery}
                      onChange={(e) => searchMovies(e.target.value)}
                      onBlur={() => setTimeout(() => setSearchResults([]), 150)}
                      autoComplete="off"
                      disabled={uploading}
                    />
                    {searching && <p className="file-hint">Searching…</p>}
                    {searchResults.length > 0 && (
                      <div className="clip-search-results">
                        {searchResults.map((r) => (
                          <button
                            type="button"
                            key={`${r.media_type}-${r.id}`}
                            className="clip-search-item"
                            onMouseDown={(e) => { e.preventDefault(); pickMovie(r) }}
                          >
                            <Icon name={r.media_type === 'movie' ? 'film' : 'tv'} size={14} />
                            <span>{r.title}{r.year ? ` (${r.year})` : ''}</span>
                            <span className="clip-search-kind">{r.kind}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {uploadError && <p className="form-error">{uploadError}</p>}

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowUpload(false)}
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn--accent"
                  disabled={uploading || !selectedFile || !caption.trim()}
                >
                  {uploading ? (
                    <>
                      <span className="btn-spinner" /> Uploading…
                    </>
                  ) : (
                    'Post Clip'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
