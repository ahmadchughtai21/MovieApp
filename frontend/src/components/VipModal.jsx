import { useEffect, useState } from 'react'
import Icon from './Icon'

const PERKS = [
  { icon: 'heart', title: 'Unlimited swipes', text: 'See every CineSwipe profile, every day.' },
  { icon: 'globe', title: 'Priority placement', text: 'Get surfaced first in your city feed.' },
  { icon: 'star', title: 'VIP badge', text: 'Stand out on your profile and community messages.' },
]

export default function VipModal({ open, onClose }) {
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!open) return undefined
    function onKeyDown(event) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  function showComingSoon() {
    setNotice('VIP memberships are coming soon. This feature will launch later — stay tuned!')
  }

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      style={{ background: 'rgba(11, 11, 14, 0.82)' }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="vip-title"
        onClick={(event) => event.stopPropagation()}
        style={{
          width: 'min(420px, 100%)',
          padding: 0,
          overflow: 'hidden',
          background: '#0b0b0e',
          border: '1px solid rgba(129, 140, 248, 0.28)',
          boxShadow: '0 28px 80px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(99, 102, 241, 0.08)',
        }}
      >
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>

        <div
          style={{
            padding: '30px 24px 22px',
            textAlign: 'center',
            background:
              'radial-gradient(120% 130% at 50% 0%, rgba(99, 102, 241, 0.26) 0%, rgba(11, 11, 14, 0) 62%)',
          }}
        >
          <span
            style={{
              display: 'inline-grid',
              placeItems: 'center',
              width: 56,
              height: 56,
              marginBottom: 14,
              borderRadius: 18,
              background: 'linear-gradient(135deg, #6366f1, #818cf8)',
              color: '#0b0b0e',
              boxShadow: '0 12px 30px rgba(99, 102, 241, 0.35)',
            }}
          >
            <Icon name="star" size={26} />
          </span>
          <h2 id="vip-title" style={{ fontSize: '1.35rem', marginBottom: 6 }}>
            Madflix VIP
          </h2>
          <p style={{ color: '#9aa0b4', fontSize: '0.86rem' }}>
            Unlock the full CineSwipe experience.
          </p>
        </div>

        <div style={{ padding: '4px 22px 22px' }}>
          <ul style={{ listStyle: 'none', display: 'grid', gap: 12, marginBottom: 22 }}>
            {PERKS.map((perk) => (
              <li key={perk.title} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <span
                  style={{
                    flex: 'none',
                    display: 'grid',
                    placeItems: 'center',
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    background: 'rgba(99, 102, 241, 0.14)',
                    color: '#a5b4fc',
                  }}
                >
                  <Icon name={perk.icon} size={16} />
                </span>
                <span>
                  <span style={{ display: 'block', fontWeight: 700, fontSize: '0.88rem' }}>
                    {perk.title}
                  </span>
                  <span style={{ display: 'block', color: '#8b90a3', fontSize: '0.78rem', lineHeight: 1.35 }}>
                    {perk.text}
                  </span>
                </span>
              </li>
            ))}
          </ul>

          {notice && (
            <div
              style={{
                marginBottom: 12,
                padding: '10px 12px',
                borderRadius: 10,
                background: 'rgba(99, 102, 241, 0.12)',
                border: '1px solid rgba(129, 140, 248, 0.3)',
                color: '#c7d2fe',
                fontSize: '0.8rem',
                lineHeight: 1.4,
              }}
            >
              {notice}
            </div>
          )}

          <button
            type="button"
            className="btn btn--full"
            onClick={showComingSoon}
            style={{
              padding: '13px 16px',
              borderRadius: 12,
              background: 'linear-gradient(135deg, #6366f1, #818cf8)',
              color: '#0b0b0e',
              fontWeight: 800,
              fontSize: '0.9rem',
              boxShadow: '0 12px 28px rgba(99, 102, 241, 0.3)',
            }}
          >
            VIP coming soon · Rs. 500/mo
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              display: 'block',
              width: '100%',
              marginTop: 10,
              padding: 8,
              color: '#8b90a3',
              fontSize: '0.8rem',
            }}
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  )
}
