import { useEffect, useRef, useState, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'
import Icon from './Icon'

export default function Player({ src, sources, title, tmdbId, mediaType, season, episode, posterPath }) {
  const { user } = useAuth()
  const wrapperRef = useRef(null)
  const iframeRef = useRef(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const mountedAt = useRef(Date.now())
  const sessionIdRef = useRef(null)

  const sourceList = sources && sources.length > 0
    ? sources
    : (src ? [{ id: 'default', name: 'Server 1', url: src }] : [])

  const currentSource = sourceList[activeIndex] || sourceList[0]

  useEffect(() => {
    if (!user || !tmdbId) return
    api.sessionCreate({
      tmdb_id: tmdbId,
      media_type: mediaType || 'movie',
      title: title || '',
      season: season || null,
      episode: episode || null,
    }).then((s) => {
      sessionIdRef.current = s.id
    }).catch(() => {})
  }, [user, tmdbId, mediaType, title, season, episode])

  useEffect(() => {
    return () => {
      if (!user || !tmdbId) return
      const elapsed = (Date.now() - mountedAt.current) / 1000
      if (elapsed > 30) {
        api.markAsWatched({
          tmdb_id: tmdbId,
          media_type: mediaType || 'movie',
          title: title || '',
          poster_path: posterPath || '',
          season: season || null,
          episode: episode || null,
          completed: false,
        }).catch(() => {})
      }
      if (sessionIdRef.current) {
        api.sessionUpdate(sessionIdRef.current, { active: false }).catch(() => {})
      }
    }
  }, [user, tmdbId, mediaType, title, season, episode])

  const handleFullscreenChange = useCallback(() => {
    setIsFullscreen(Boolean(document.fullscreenElement))
  }, [])

  useEffect(() => {
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [handleFullscreenChange])

  const toggleFullscreen = useCallback(async () => {
    const el = wrapperRef.current
    if (!el) return
    try {
      if (isFullscreen) {
        if (document.exitFullscreen) await document.exitFullscreen()
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen()
      } else {
        if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' })
        else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen()
      }
    } catch {}
  }, [isFullscreen])

  if (!currentSource) return null

  return (
    <div className={`p-wrap${isFullscreen ? ' p-fullscreen' : ''}`}>
      <div className="p-player" ref={wrapperRef}>
        <div className="p-aspect">
          <iframe
            key={currentSource.id}
            ref={iframeRef}
            title={title || 'Stream player'}
            src={currentSource.url}
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen; web-share"
            referrerPolicy="no-referrer"
            webkitAllowFullScreen
            mozAllowFullScreen
          />
        </div>

        <div className="p-controls">
          <button
            type="button"
            className="p-fs-btn"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            <Icon name={isFullscreen ? 'x' : 'maximize'} size={16} />
            <span>{isFullscreen ? 'Exit' : 'Fullscreen'}</span>
          </button>
        </div>
      </div>

      {sourceList.length > 1 && (
        <div className="p-servers">
          <span className="p-servers-label">Servers</span>
          <div className="p-servers-list">
            {sourceList.map((source, i) => (
              <button
                key={source.id}
                type="button"
                className={`p-server${i === activeIndex ? ' active' : ''}`}
                onClick={() => setActiveIndex(i)}
              >
                <span className="p-server-num">{i + 1}</span>
                <span className="p-server-name">{source.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
