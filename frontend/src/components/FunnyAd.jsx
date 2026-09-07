import { useState, useEffect } from 'react'

const RICKROLL_URL = 'https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1'

export default function FunnyAd() {
  const [showAd, setShowAd] = useState(false)
  const [showRickroll, setShowRickroll] = useState(false)

  useEffect(() => {
    const seen = sessionStorage.getItem('madflix_rick')
    if (seen) return
    const t = setTimeout(() => setShowAd(true), 2000)
    return () => clearTimeout(t)
  }, [])

  if (!showAd && !showRickroll) return null

  if (showRickroll) {
    return (
      <div className="rickroll-overlay" onClick={() => { sessionStorage.setItem('madflix_rick', '1'); setShowRickroll(false) }}>
        <div className="rickroll-card" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="rickroll-close" onClick={() => { sessionStorage.setItem('madflix_rick', '1'); setShowRickroll(false) }}>×</button>
          <iframe
            src={RICKROLL_URL}
            title="You've been rickrolled"
            allow="autoplay; encrypted-media"
            allowFullScreen
            className="rickroll-iframe"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="ad-overlay">
      <div className="ad-card">
        <button type="button" className="ad-close" onClick={() => { sessionStorage.setItem('madflix_rick', '1'); setShowAd(false) }}>×</button>
        <div className="ad-flash">🚨 URGENT POPUP 🚨</div>
        <h3 className="ad-title">Congratulations!</h3>
        <p className="ad-text">
          You are the <strong>1,000,000th visitor</strong> to this movie page!
          <br/>
          Your prize is waiting. Click below to claim your free gift.
        </p>
        <button type="button" className="btn btn-accent ad-btn" onClick={() => { setShowAd(false); setShowRickroll(true) }}>
          🎁 CLAIM MY PRIZE
        </button>
        <p className="ad-fine">*Terms and conditions apply. Gift may or may not be a rickroll.</p>
      </div>
    </div>
  )
}
