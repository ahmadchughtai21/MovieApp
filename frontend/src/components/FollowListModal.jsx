import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import Loading from './Loading'
import AuthPrompt from './AuthPrompt'

function Avatar({ name, url, size = 36 }) {
  if (url) {
    return <img className="avatar" src={url} alt={name} style={{ width: size, height: size }} />
  }
  const initial = (name || '?').charAt(0).toUpperCase()
  return (
    <span className="avatar avatar--initial" style={{ width: size, height: size, fontSize: size * 0.45 }}>
      {initial}
    </span>
  )
}

export default function FollowListModal({ username, mode, onClose }) {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [followingMap, setFollowingMap] = useState({})
  const [showAuth, setShowAuth] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    const fetcher = mode === 'followers' ? api.profileFollowers : api.profileFollowing
    fetcher(username)
      .then((data) => {
        setItems(data || [])
        const map = {}
        ;(data || []).forEach((u) => { map[u.username] = u.is_following })
        setFollowingMap(map)
      })
      .catch((e) => setError(e.message || 'Failed to load'))
      .finally(() => setLoading(false))
  }, [username, mode])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const toggleFollow = async (person) => {
    if (!user || person.is_me) return
    try {
      const res = await api.followToggle(person.username)
      setFollowingMap((m) => ({ ...m, [person.username]: res.following }))
      setItems((list) =>
        list.map((u) => (u.username === person.username ? { ...u, is_following: res.following } : u))
      )
    } catch { /* ignore */ }
  }

  const title = mode === 'followers' ? 'Followers' : 'Following'

  return createPortal(
    <>
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal follow-list-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        <h3 className="follow-list-modal__title">{title}</h3>
        <div className="follow-list-modal__spacer" />

        {loading ? (
          <Loading />
        ) : error ? (
          <p className="follow-list-modal__empty">{error}</p>
        ) : items.length === 0 ? (
          <p className="follow-list-modal__empty">
            {mode === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
          </p>
        ) : (
          <ul className="follow-list">
            {items.map((person) => (
              <li key={person.username} className="follow-list__item">
                <Link
                  to={`/user/${person.username}`}
                  className="follow-list__user"
                  onClick={onClose}
                >
                  <Avatar name={person.display_name} url={person.avatar_url} size={36} />
                  <span className="follow-list__info">
                    <span className="follow-list__name">{person.display_name}</span>
                    <span className="follow-list__handle">@{person.username}</span>
                  </span>
                </Link>
                {!person.is_me && (
                  <button
                    className={`btn btn--sm ${followingMap[person.username] ? 'btn-ghost' : 'btn--accent'}`}
                    onClick={() => (user ? toggleFollow(person) : setShowAuth(true))}
                  >
                    {followingMap[person.username] ? 'Following' : 'Follow'}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
      <AuthPrompt open={showAuth} onClose={() => setShowAuth(false)} />
    </>,
    document.body
  )
}
