import { useEffect, useRef, useState, useCallback } from 'react'
import Icon from './Icon'

export default function Player({ src, sources, title }) {
  const wrapperRef = useRef(null)
  const iframeRef = useRef(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showOverlay, setShowOverlay] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  const sourceList = sources && sources.length > 0
    ? sources
    : (src ? [{ id: 'default', name: 'Stream', url: src }] : [])

  const currentSource = sourceList[activeIndex] || sourceList[0]

  const handleFullscreenChange = useCallback(() => {
    setIsFullscreen(Boolean(document.fullscreenElement))
  }, [])

  useEffect(() => {
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [handleFullscreenChange])

  const enterFullscreen = useCallback(async () => {
    const el = wrapperRef.current
    if (!el) return
    try {
      if (el.requestFullscreen) {
        await el.requestFullscreen({ navigationUI: 'hide' })
      } else if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen()
      } else if (el.mozRequestFullScreen) {
        el.mozRequestFullScreen()
      } else if (el.msRequestFullscreen) {
        el.msRequestFullscreen()
      }
    } catch (err) {
      console.error('Fullscreen request failed:', err)
    }
  }, [])

  const exitFullscreen = useCallback(async () => {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen()
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen()
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen()
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen()
      }
    } catch (err) {
      console.error('Exit fullscreen failed:', err)
    }
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (isFullscreen) {
      exitFullscreen()
    } else {
      enterFullscreen()
    }
  }, [isFullscreen, enterFullscreen, exitFullscreen])

  if (!currentSource) return null

  const showToggle = sourceList.length > 1

  return (
    <div className="player-wrap">
      <div
        ref={wrapperRef}
        className="player"
        onMouseEnter={() => setShowOverlay(true)}
        onMouseLeave={() => setShowOverlay(false)}
      >
        <div className="player-aspect">
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
          <button
            type="button"
            className={`player-fs-btn${showOverlay || isFullscreen ? ' visible' : ''}${isFullscreen ? ' player-fs-btn--exit' : ''}`}
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen ? (
              <>
                <Icon name="x" size={16} />
                <span className="player-fs-btn-label">Exit</span>
              </>
            ) : (
              <>
                <FullscreenIcon size={16} />
                <span className="player-fs-btn-label">Fullscreen</span>
              </>
            )}
          </button>
        </div>
      </div>

      {showToggle ? (
        <div className="stream-toggle" role="tablist" aria-label="Stream sources">
          <span className="stream-toggle-label">Servers</span>
          <div className="stream-toggle-list">
            {sourceList.map((source, index) => (
              <button
                key={source.id}
                type="button"
                role="tab"
                aria-selected={index === activeIndex}
                className={`stream-toggle-btn${index === activeIndex ? ' active' : ''}`}
                onClick={() => setActiveIndex(index)}
              >
                <span className="stream-toggle-num">{index + 1}</span>
                <span className="stream-toggle-name">{source.name}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function FullscreenIcon({ size = 16 }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 9V5a2 2 0 0 1 2-2h4" />
      <path d="M21 9V5a2 2 0 0 0-2-2h-4" />
      <path d="M3 15v4a2 2 0 0 0 2 2h4" />
      <path d="M21 15v4a2 2 0 0 1-2 2h-4" />
    </svg>
  )
}
