import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import Icon from './Icon'
import FoundingBadge from './FoundingBadge'
import VipBadge from './VipBadge'

export default function SuggestedFollow() {
  const { user } = useAuth()
  const [people, setPeople] = useState([])
  const [busy, setBusy] = useState({})
  const [requested, setRequested] = useState({})

  useEffect(() => {
    if (!user) return undefined
    let active = true
    api.suggestedUsers()
      .then((data) => {
        if (active) setPeople(Array.isArray(data) ? data : [])
      })
      .catch(() => {})
    return () => { active = false }
  }, [user])

  if (!user || people.length === 0) return null

  async function requestFriend(username) {
    if (busy[username] || requested[username]) return
    setBusy((prev) => ({ ...prev, [username]: true }))
    try {
      const result = await api.sendFriendRequest(username)
      if (result?.status === 'friends') {
        setPeople((prev) => prev.filter((person) => person.username !== username))
      } else {
        setRequested((prev) => ({ ...prev, [username]: true }))
      }
    } catch {
      // keep the button available on failure
    } finally {
      setBusy((prev) => ({ ...prev, [username]: false }))
    }
  }

  return (
    <section className="suggest-follow">
      <div className="suggest-follow__head">
        <div>
          <h2 className="section-title">People to follow</h2>
          <p className="section-sub">Mutual friends and film lovers in your city</p>
        </div>
      </div>

      <div className="suggest-follow__rail">
        {people.map((person) => (
          <article key={person.username} className="suggest-follow__card">
            <Link to={`/user/${person.username}`} className="suggest-follow__avatar-wrap">
              {person.avatar_url ? (
                <img className="suggest-follow__avatar" src={person.avatar_url} alt="" />
              ) : (
                <span className="suggest-follow__avatar suggest-follow__avatar--initial">
                  {(person.display_name || person.username || '?').charAt(0).toUpperCase()}
                </span>
              )}
            </Link>
            <Link to={`/user/${person.username}`} className="suggest-follow__name">
              {person.display_name || person.username}
              {person.is_founding_member && <FoundingBadge size={10} />}
              {person.is_vip && <VipBadge size={9} />}
            </Link>
            <span className="suggest-follow__handle">@{person.username}</span>
            <span className="suggest-follow__reason">
              <Icon name={person.mutual_count > 0 ? 'users' : 'globe'} size={11} />
              {person.reason}
            </span>
            <button
              type="button"
              className={`btn btn--sm suggest-follow__btn ${requested[person.username] ? 'btn-ghost' : 'btn--accent'}`}
              onClick={() => requestFriend(person.username)}
              disabled={busy[person.username] || requested[person.username]}
            >
              {busy[person.username] ? 'Sending…' : requested[person.username] ? 'Requested' : 'Follow'}
            </button>
          </article>
        ))}
      </div>
    </section>
  )
}
