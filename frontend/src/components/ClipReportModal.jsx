import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import Icon from './Icon'

const REASONS = [
  { value: 'spam', label: 'Spam or misleading' },
  { value: 'inappropriate', label: 'Sexual or violent content' },
  { value: 'copyright', label: 'Copyright violation' },
  { value: 'harassment', label: 'Harassment or hate' },
  { value: 'other', label: 'Something else' },
]

export default function ClipReportModal({ clip, onClose, onDone }) {
  const [reason, setReason] = useState('spam')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const submit = async (e) => {
    e.preventDefault()
    setSending(true)
    setError('')
    try {
      await api.clipReport(clip.id, { reason })
      onDone()
    } catch {
      setError('Could not send the report. Try again.')
      setSending(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal report-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Report clip"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose} aria-label="Close">
          <Icon name="x" size={16} />
        </button>
        <h2 className="modal-title">Report this clip</h2>
        <p className="report-sub">Reports are private. Our team reviews every one.</p>
        <form onSubmit={submit}>
          <div className="report-options">
            {REASONS.map((r) => (
              <label key={r.value} className="report-option">
                <input
                  type="radio"
                  name="clip-reason"
                  value={r.value}
                  checked={reason === r.value}
                  onChange={() => setReason(r.value)}
                />
                <span>{r.label}</span>
              </label>
            ))}
          </div>
          {error && <p className="form-error">{error}</p>}
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn--accent" disabled={sending}>
              {sending ? 'Sending…' : 'Submit report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
