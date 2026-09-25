import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import Icon from './Icon'

export default function ClipEditModal({ clip, onClose, onSaved }) {
  const [caption, setCaption] = useState(clip.caption || '')
  const [taggedMovie, setTaggedMovie] = useState(
    clip.tmdb_id ? { id: clip.tmdb_id, media_type: clip.media_type, title: '', year: '' } : null
  )
  const [movieQuery, setMovieQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const seqRef = useRef(0)
  const tagSeqRef = useRef(0)

  useEffect(() => {
    if (!clip.tmdb_id || !clip.media_type) return undefined
    const seq = ++tagSeqRef.current
    let active = true
    const fetchDetails = clip.media_type === 'tv' ? api.showDetails : api.movieDetails
    fetchDetails(clip.tmdb_id)
      .then((d) => {
        if (!active || seq !== tagSeqRef.current) return
        const item = clip.media_type === 'tv' ? d.show_details : d.movie_details
        const title = item?.name || item?.title || 'Untitled'
        const year = ((item?.first_air_date || item?.release_date) || '').slice(0, 4)
        setTaggedMovie({ id: clip.tmdb_id, media_type: clip.media_type, title, year })
      })
      .catch(() => {})
    return () => { active = false }
  }, [clip.tmdb_id, clip.media_type])

  const clearTag = () => {
    tagSeqRef.current++
    setTaggedMovie(null)
  }

  const pickTag = (m) => {
    tagSeqRef.current++
    setTaggedMovie(m)
    setMovieQuery('')
    setSearchResults([])
  }

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const searchMovies = async (q) => {
    setMovieQuery(q)
    if (!q.trim()) {
      setSearchResults([])
      return
    }
    const seq = ++seqRef.current
    setSearching(true)
    try {
      const data = await api.multiSearch(q, 1)
      if (seq !== seqRef.current) return
      const results = (data.results || [])
        .filter((r) => r.media_type === 'movie' || r.media_type === 'tv')
        .slice(0, 8)
        .map((r) => ({
          id: r.id,
          title: r.media_type === 'movie' ? r.title : r.name,
          media_type: r.media_type,
          kind: r.media_type === 'movie' ? 'Movie' : 'Series',
          year: ((r.media_type === 'movie' ? r.release_date : r.first_air_date) || '').slice(0, 4),
        }))
      setSearchResults(results)
    } catch {
      if (seq === seqRef.current) setSearchResults([])
    } finally {
      if (seq === seqRef.current) setSearching(false)
    }
  }

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      const updated = await api.clipUpdate(clip.id, {
        caption: caption.trim(),
        tmdb_id: taggedMovie ? taggedMovie.id : null,
        media_type: taggedMovie ? taggedMovie.media_type : '',
        media_title: taggedMovie ? (taggedMovie.title || '') : '',
      })
      onSaved(updated)
    } catch (err) {
      let msg = 'Failed to save changes.'
      try {
        const parsed = JSON.parse(String(err?.message || ''))
        const first = parsed && typeof parsed === 'object' ? Object.values(parsed).flat()[0] : null
        if (first) msg = String(Array.isArray(first) ? first[0] : first)
      } catch { /* keep generic */ }
      setError(msg)
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={() => { if (!saving) onClose() }}>
      <div
        className="modal clip-upload-modal clip-edit-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Edit clip"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
          <Icon name="x" size={16} />
        </button>
        <h2 className="modal-title">Edit clip</h2>

        <div className="clip-upload-form">
          <div className="form-group">
            <div className="form-label-row">
              <label htmlFor="clip-edit-caption">Caption</label>
              <span className={`char-count${caption.length > 1800 ? ' near' : ''}`}>
                {caption.length}/2000
              </span>
            </div>
            <textarea
              id="clip-edit-caption"
              maxLength={2000}
              rows={4}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Say something about this clip…"
              disabled={saving}
            />
          </div>

          <div className="form-group clip-search-wrap">
            <label htmlFor="clip-edit-movie">Tag a movie or series (optional)</label>
            {taggedMovie ? (
              <div className="tagged-row">
                <span className="tagged-badge">
                  <Icon name={taggedMovie.media_type === 'movie' ? 'film' : 'tv'} size={12} />
                  {taggedMovie.title || 'Untitled'}{taggedMovie.year ? ` (${taggedMovie.year})` : ''}
                  <button
                    type="button"
                    onClick={clearTag}
                    aria-label="Remove tag"
                    disabled={saving}
                  >
                    <Icon name="x" size={12} />
                  </button>
                </span>
                <span className="file-hint">Remove the tag to search for another title.</span>
              </div>
            ) : (
              <>
                <input
                  id="clip-edit-movie"
                  type="text"
                  placeholder="Search titles…"
                  value={movieQuery}
                  onChange={(e) => searchMovies(e.target.value)}
                  onBlur={() => setTimeout(() => setSearchResults([]), 150)}
                  autoComplete="off"
                  disabled={saving}
                />
                {searching && <p className="file-hint">Searching…</p>}
                {searchResults.length > 0 && (
                  <div className="clip-search-results">
                    {searchResults.map((r) => (
                      <button
                        type="button"
                        key={`${r.media_type}-${r.id}`}
                        className="clip-search-item"
                        onMouseDown={(e) => {
                          e.preventDefault()
                          pickTag(r)
                        }}
                      >
                        <Icon name={r.media_type === 'movie' ? 'film' : 'tv'} size={14} />
                        <span>{r.title}{r.year ? ` (${r.year})` : ''}</span>
                        <span className="clip-search-kind">{r.kind}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <p className="file-hint">Tagged titles show this clip on their page.</p>

          {error && <p className="form-error">{error}</p>}
        </div>

        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="btn btn--accent" onClick={save} disabled={saving}>
            {saving ? (
              <>
                <span className="btn-spinner" /> Saving…
              </>
            ) : (
              'Save changes'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
