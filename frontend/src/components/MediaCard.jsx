import { Link } from 'react-router-dom'
import { buildImageUrl } from '../lib/image'
import { useImageConfig } from '../lib/imageConfig'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'
import { useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import Icon from './Icon'
import AuthPrompt from './AuthPrompt'

const KIND_LABEL = {
  movie: 'Movie',
  show: 'Series',
  person: 'Person'
}

function Tooltip({ children, text }) {
  const [show, setShow] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const timer = useRef(null)
  const wrapRef = useRef(null)

  const onEnter = () => {
    timer.current = setTimeout(() => {
      if (wrapRef.current) {
        const rect = wrapRef.current.getBoundingClientRect()
        setPos({ x: rect.left + rect.width / 2, y: rect.top })
      }
      setShow(true)
    }, 600)
  }
  const onLeave = () => {
    clearTimeout(timer.current)
    setShow(false)
  }

  return (
    <span className="tooltip-wrap" ref={wrapRef} onMouseEnter={onEnter} onMouseLeave={onLeave}>
      {children}
      {show && createPortal(
        <span className="tooltip-tip" style={{ left: pos.x, top: pos.y - 8, transform: 'translate(-50%, -100%)' }}>
          {text}
        </span>,
        document.body
      )}
    </span>
  )
}

export default function MediaCard({ item, to, kind = 'movie' }) {
  const config = useImageConfig()
  const { user } = useAuth()
  const [inWatchlist, setInWatchlist] = useState(false)
  const [watched, setWatched] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [statusChecked, setStatusChecked] = useState(false)

  const mediaType = kind === 'show' ? 'tv' : kind

  const checkStatus = useCallback(() => {
    if (statusChecked || !user || !item?.id || kind === 'person') return
    setStatusChecked(true)
    api.watchlistCheck(item.id, mediaType)
      .then((data) => setInWatchlist(data.in_watchlist))
      .catch(() => {})
    api.checkWatched(item.id, mediaType)
      .then((data) => setWatched(data.watched))
      .catch(() => {})
  }, [statusChecked, user, item?.id, mediaType, kind])

  if (!item) return null

  const title = item.title || item.name || item.original_name || 'Untitled'
  const date = item.release_date || item.first_air_date
  const imagePath = kind === 'person' ? item.profile_path : item.poster_path
  const image = buildImageUrl(config, imagePath, kind === 'person' ? 'profile' : 'poster', 'w342')
  const rating = item.vote_average ? item.vote_average.toFixed(1) : null
  const year = date ? new Date(date).getFullYear() : null

  const toggleWatchlist = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user) { setShowAuth(true); return }
    try {
      if (inWatchlist) {
        const items = await api.watchlist(mediaType)
        const wlItem = items.find((i) => i.tmdb_id === item.id && i.media_type === mediaType)
        if (wlItem) await api.watchlistRemove(wlItem.id)
        setInWatchlist(false)
        setSuccessMsg('Removed from watchlist')
      } else {
        await api.watchlistAdd({ media_type: mediaType, tmdb_id: item.id, title: item.title, poster_path: item.poster_path })
        setInWatchlist(true)
        setSuccessMsg('Added to watchlist')
      }
    } catch (err) {
      setSuccessMsg(err.message || 'Failed')
    }
    setTimeout(() => setSuccessMsg(''), 3000)
  }

  const toggleWatched = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user) { setShowAuth(true); return }
    try {
      await api.markAsWatched({ media_type: mediaType, tmdb_id: item.id, title: item.title || item.name, poster_path: item.poster_path, completed: !watched })
      setWatched(!watched)
      setSuccessMsg(watched ? 'Marked as unwatched' : 'Marked as watched')
    } catch (err) {
      setSuccessMsg(err.message || 'Failed')
    }
    setTimeout(() => setSuccessMsg(''), 3000)
  }

  return (
    <>
      <Link to={to} className="media-card" tabIndex={0} onMouseEnter={checkStatus}>
        <div className="media-poster">
          {image ? (
            <img src={image} alt={title} loading="lazy" decoding="async" />
          ) : (
            <div className="poster-fallback">No image</div>
          )}
          <span className="media-badge">{KIND_LABEL[kind] || 'Movie'}</span>
          {rating && kind !== 'person' ? (
            <span className="media-rating">
              <Icon name="star" size={12} />
              {rating}
            </span>
          ) : null}

          {kind !== 'person' ? (
            <div className="card-actions">
              <Tooltip text={inWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}>
                <button
                  className={`card-action-btn${inWatchlist ? ' active' : ''}${inWatchlist && watched ? ' active-filled' : ''}`}
                  onClick={toggleWatchlist}
                  aria-label="Watchlist"
                >
                  <Icon name="bookmark" size={15} />
                </button>
              </Tooltip>
            </div>
          ) : null}
        </div>
        <div className="media-info">
          <div className="media-title" title={title}>{title}</div>
          <div className="media-meta">
            {year ? <span>{year}</span> : <span>&mdash;</span>}
          </div>
        </div>
      </Link>
      <AuthPrompt open={showAuth} onClose={() => setShowAuth(false)} />
      {successMsg && (
        <div className="card-success">
          {successMsg}
        </div>
      )}
    </>
  )
}