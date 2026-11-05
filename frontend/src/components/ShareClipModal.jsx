import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import Icon from './Icon'

export default function ShareClipModal({ clip, onClose }) {
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [sendingTo, setSendingTo] = useState(null)
  const [sentTo, setSentTo] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let active = true
    api.socialFollowers()
      .then((data) => { if (active) setContacts(Array.isArray(data) ? data : []) })
      .catch(() => { if (active) setError('Could not load your friends.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  async function share(contact) {
    if (sendingTo) return
    setSendingTo(contact.id)
    setError('')
    try {
      await api.shareClip(clip.id, contact.id)
      setSentTo(contact.username)
    } catch (err) {
      setError(err?.message || 'Could not share this clip.')
    } finally {
      setSendingTo(null)
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/clips/${clip.id}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      setError('Could not copy the link.')
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        style={{ width: 'min(440px, 100%)', padding: 22 }}
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">×</button>
        <h2 className="modal-title">Share clip</h2>
        <p className="page-sub" style={{ marginBottom: 12 }}>
          {clip.media_title || clip.caption || 'Madflix clip'}
        </p>

        <button type="button" className="share-clip__copy" onClick={copyLink}>
          <Icon name="link" size={15} />
          {copied ? 'Link copied' : 'Copy link'}
        </button>

        {error && <div className="auth-error" style={{ marginTop: 10 }}>{error}</div>}
        {sentTo && (
          <div className="share-clip__sent" style={{ marginTop: 10 }}>
            Sent to @{sentTo}
          </div>
        )}

        <div className="share-clip__list">
          {loading && <p className="page-sub">Loading friends…</p>}
          {!loading && contacts.length === 0 && (
            <p className="page-sub">No accepted friends yet. Match with someone on CineSwipe first.</p>
          )}
          {contacts.map((contact) => (
            <button
              key={contact.id}
              type="button"
              className="share-clip__person"
              onClick={() => share(contact)}
              disabled={Boolean(sendingTo)}
            >
              {contact.avatar_url ? (
                <img src={contact.avatar_url} alt="" />
              ) : (
                <span className="share-clip__avatar">
                  {(contact.display_name || contact.username || '?').charAt(0).toUpperCase()}
                </span>
              )}
              <span>
                <strong>{contact.display_name || contact.username}</strong>
                <em>@{contact.username}</em>
              </span>
              <span className="share-clip__action">
                {sendingTo === contact.id ? 'Sending…' : 'Send'}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
