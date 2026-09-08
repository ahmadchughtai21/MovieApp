import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import Icon from './Icon'

const SHOWN_KEY = 'madflix_rickroll_seen'

export default function RickrollAd() {
  const [show, setShow] = useState(false)
  const [phase, setPhase] = useState('intro')
  const timerRef = useRef(null)

  useEffect(() => {
    if (sessionStorage.getItem(SHOWN_KEY)) return
    timerRef.current = setTimeout(() => setShow(true), 12000)
    return () => clearTimeout(timerRef.current)
  }, [])

  function handleShowAd() {
    sessionStorage.setItem(SHOWN_KEY, '1')
    setPhase('ad')
  }

  function handleDismiss() {
    sessionStorage.setItem(SHOWN_KEY, '1')
    setShow(false)
  }

  if (!show) return null

  if (phase === 'intro') {
    return createPortal(
      <div className="rr-backdrop" onClick={handleDismiss}>
        <div className="rr-popup" onClick={(e) => e.stopPropagation()}>
          <div className="rr-popup-icon">
            <Icon name="play" size={28} />
          </div>
          <h2 className="rr-popup-title">You've been selected!</h2>
          <p className="rr-popup-text">
            Congratulations! You've won a <strong>FREE premium movie</strong> just for being here.
            Click below to claim your exclusive reward!
          </p>
          <button className="rr-popup-btn" onClick={handleShowAd}>
            🎬 Watch Now — It's Free!
          </button>
          <button className="rr-popup-skip" onClick={handleDismiss}>
            No thanks, I hate fun
          </button>
        </div>
      </div>,
      document.body
    )
  }

  return createPortal(
    <div className="rr-backdrop" onClick={handleDismiss}>
      <div className="rr-ad" onClick={(e) => e.stopPropagation()}>
        <div className="rr-ad-head">
          <span className="rr-ad-badge">EXCLUSIVE</span>
          <button className="rr-ad-close" onClick={handleDismiss} aria-label="Close">
            <Icon name="x" size={18} />
          </button>
        </div>
        <div className="rr-ad-player">
          <iframe
            src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&mute=0&rel=0&modestbranding=1"
            title="Your exclusive movie"
            allow="autoplay; encrypted-media"
            allowFullScreen
          />
        </div>
        <div className="rr-ad-foot">
          <span className="rr-ad-enjoy">Enjoy! 🍿</span>
        </div>
      </div>
    </div>,
    document.body
  )
}
