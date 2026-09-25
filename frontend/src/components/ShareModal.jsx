import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import Icon from './Icon'

function Avatar({ name, url, size = 40 }) {
  if (url) {
    return <img className="avatar" src={url} alt={name} style={{ width: size, height: size }} />
  }
  const initial = (name || '?').charAt(0).toUpperCase()
  return (
    <span className="avatar avatar--initial" style={{ width: size, height: size, fontSize: size * 0.42 }}>
      {initial}
    </span>
  )
}

function buildShareUrl(profile) {
  return `${window.location.origin}/user/${profile.username}`
}

export default function ShareModal({ profile, onClose }) {
  const [copied, setCopied] = useState(false)
  const [nativeSupported, setNativeSupported] = useState(false)
  const url = buildShareUrl(profile)
  const name = profile.display_name || profile.username
  const text = `Check out ${name} (@${profile.username}) on Madflix`

  useEffect(() => {
    setNativeSupported(typeof navigator !== 'undefined' && typeof navigator.share === 'function')
  }, [])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const copyLink = useCallback(async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url)
      } else {
        const el = document.createElement('textarea')
        el.value = url
        el.setAttribute('readonly', '')
        el.style.position = 'fixed'
        el.style.opacity = '0'
        document.body.appendChild(el)
        el.select()
        document.execCommand('copy')
        document.body.removeChild(el)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* ignore */ }
  }, [url])

  const shareNative = async () => {
    if (!nativeSupported) return
    try {
      await navigator.share({ title: `${name} · Madflix`, text, url })
    } catch { /* cancelled */ }
  }

  const openWin = (href) => {
    window.open(href, '_blank', 'noopener,noreferrer,width=640,height=560')
  }

  const encoded = {
    u: encodeURIComponent(url),
    t: encodeURIComponent(text),
  }

  const channels = [
    {
      id: 'x',
      label: 'X',
      href: `https://twitter.com/intent/tweet?text=${encoded.t}&url=${encoded.u}`,
    },
    {
      id: 'facebook',
      label: 'Facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encoded.u}`,
    },
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      href: `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
    },
    {
      id: 'bluesky',
      label: 'Bluesky',
      href: `https://bsky.app/intent/compose?text=${encodeURIComponent(`${text}\n${url}`)}`,
    },
    {
      id: 'reddit',
      label: 'Reddit',
      href: `https://www.reddit.com/submit?url=${encoded.u}&title=${encoded.t}`,
    },
    {
      id: 'email',
      label: 'Email',
      href: `mailto:?subject=${encodeURIComponent(`${name} on Madflix`)}&body=${encodeURIComponent(`${text}\n${url}`)}`,
    },
  ]

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal share-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Share profile">
        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        <h3 className="share-modal__title">Share profile</h3>

        <div className="share-modal__profile">
          <Avatar name={name} url={profile.avatar_url} size={44} />
          <div className="share-modal__who">
            <span className="share-modal__name">{name}</span>
            <span className="share-modal__handle">@{profile.username}</span>
          </div>
        </div>

        <div className="share-modal__link">
          <Icon name="link" size={14} className="share-modal__link-icon" />
          <span className="share-modal__url" title={url}>{url}</span>
        </div>

        <div className="share-modal__actions">
          <button type="button" className="btn btn--accent btn--sm" onClick={copyLink}>
            <Icon name={copied ? 'check' : 'copy'} size={14} />
            {copied ? 'Copied' : 'Copy link'}
          </button>
          {nativeSupported && (
            <button type="button" className="btn btn-ghost btn--sm" onClick={shareNative}>
              <Icon name="share" size={14} />
              Share…
            </button>
          )}
        </div>

        <p className="share-modal__label">Share on</p>
        <div className="share-modal__channels">
          {channels.map((ch) => (
            <button
              key={ch.id}
              type="button"
              className={`share-channel share-channel--${ch.id}`}
              onClick={() => openWin(ch.href)}
            >
              {ch.label}
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  )
}
