import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import StarRating from './StarRating'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'

export default function LogModal({ tmdbId, mediaType, title, posterPath, onClose }) {
  const { user } = useAuth()
  const [rating, setRating] = useState(0)
  const [review, setReview] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [existingLog, setExistingLog] = useState(null)
  const [checkingExisting, setCheckingExisting] = useState(true)

  useEffect(() => {
    if (!user) return
    api.logForMovie(tmdbId, mediaType)
      .then((logs) => {
        const myLog = logs.find((l) => l.username === user.username && l.media_type === mediaType)
        if (myLog) {
          setExistingLog(myLog)
          setRating(myLog.rating || 0)
          setReview(myLog.review || '')
        }
      })
      .catch(() => {})
      .finally(() => setCheckingExisting(false))
  }, [tmdbId, mediaType, user])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleSave = async () => {
    if (!user) return
    setLoading(true)
    setMessage(null)
    try {
      await api.logAdd({
        tmdb_id: tmdbId,
        media_type: mediaType,
        rating: rating || null,
        review,
      })
      setMessage('Saved!')
      setTimeout(() => onClose(), 600)
    } catch {
      setMessage('Failed to save')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!existingLog) return
    setLoading(true)
    try {
      await api.logDelete(existingLog.id)
      setMessage('Removed')
      setTimeout(() => onClose(), 600)
    } catch {
      setMessage('Failed to remove')
    } finally {
      setLoading(false)
    }
  }

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal log-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>

        <div className="log-modal__header">
          {posterPath && (
            <img
              className="log-modal__poster"
              src={`https://image.tmdb.org/t/p/w200${posterPath}`}
              alt={title}
            />
          )}
          <div className="log-modal__meta">
            <h3 className="log-modal__title">{title}</h3>
            <p className="log-modal__type">{mediaType === 'tv' ? 'TV Show' : 'Movie'}</p>
          </div>
        </div>

        {checkingExisting ? (
          <p className="log-modal__loading">Loading...</p>
        ) : (
          <div className="log-modal__body">
            <div className="log-modal__rating-section">
              <label className="log-modal__label">Your rating</label>
              <StarRating value={rating} onChange={setRating} size="lg" />
            </div>

            <div className="log-modal__review-section">
              <label className="log-modal__label">Review (optional)</label>
              <textarea
                className="log-modal__review-input"
                placeholder="What did you think?"
                value={review}
                onChange={(e) => setReview(e.target.value)}
                rows={3}
                maxLength={1000}
              />
            </div>

            <div className="log-modal__actions">
              <button
                className="btn btn--accent btn--full"
                onClick={handleSave}
                disabled={loading}
              >
                {loading ? 'Saving...' : existingLog ? 'Update' : 'Log'}
              </button>

              {existingLog && (
                <button
                  className="btn btn--ghost btn--full"
                  onClick={handleDelete}
                  disabled={loading}
                >
                  Remove
                </button>
              )}
            </div>

            {message && (
              <p className={`log-modal__msg ${message.includes('Failed') ? 'log-modal__msg--err' : ''}`}>
                {message}
              </p>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
