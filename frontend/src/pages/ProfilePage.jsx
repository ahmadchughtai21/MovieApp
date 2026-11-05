import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import StarRating from '../components/StarRating'
import Loading from '../components/Loading'
import ErrorState from '../components/ErrorState'
import PageBanner from '../components/PageBanner'
import FollowListModal from '../components/FollowListModal'
import ShareModal from '../components/ShareModal'
import AuthPrompt from '../components/AuthPrompt'
import ClipCard from '../components/ClipCard'
import ClipEditModal from '../components/ClipEditModal'
import MediaRail from '../components/MediaRail'
import Icon from '../components/Icon'
import FoundingBadge from '../components/FoundingBadge'
import VipBadge from '../components/VipBadge'

const TMDB_IMG = 'https://image.tmdb.org/t/p/w185'

function TmdbPicker({ target, onClose, onSelect }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) return undefined
    const timer = setTimeout(() => {
      setLoading(true)
      const request = target.type === 'person' ? api.searchPeople(q) : api.moviesSearch(q)
      request
        .then((data) => {
          const items = Array.isArray(data) ? data : (data.results || [])
          setResults(items.slice(0, 12))
        })
        .catch(() => setResults([]))
        .finally(() => setLoading(false))
    }, 300)
    return () => clearTimeout(timer)
  }, [query, target])

  function change(value) {
    setQuery(value)
    if (value.trim().length < 2) setResults([])
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        style={{ width: 'min(480px, 100%)', maxHeight: '80vh', overflowY: 'auto', padding: 22 }}
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">×</button>
        <h2 className="modal-title">
          {target.type === 'person' ? 'Find a person' : 'Find a film'}
        </h2>
        <input
          className="auth-input"
          value={query}
          onChange={(event) => change(event.target.value)}
          placeholder={target.type === 'person' ? 'Search actors or directors…' : 'Search movies…'}
          autoFocus
        />
        <div style={{ marginTop: 14, display: 'grid', gap: 8 }}>
          {loading && <div className="page-sub">Searching…</div>}
          {!loading && query.trim().length >= 2 && results.length === 0 && (
            <div className="page-sub">No results found.</div>
          )}
          {results.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: 8,
                textAlign: 'left',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              {item.poster_path || item.profile_path ? (
                <img
                  src={`${TMDB_IMG}${item.poster_path || item.profile_path}`}
                  alt=""
                  width="42"
                  height="60"
                  style={{ width: 42, height: 60, objectFit: 'cover', borderRadius: 6 }}
                />
              ) : (
                <span className="skeleton" style={{ width: 42, height: 60, borderRadius: 6 }} />
              )}
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontWeight: 700, fontSize: '0.88rem' }}>
                  {item.title || item.name}
                </span>
                {item.known_for_department && (
                  <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    {item.known_for_department}
                  </span>
                )}
                {item.release_date && (
                  <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    {item.release_date.slice(0, 4)}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function PosterPicker({ film, onClose, onSelect }) {
  const [posters, setPosters] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    api.moviePosters(film.id)
      .then((data) => { if (active) setPosters(Array.isArray(data) ? data : []) })
      .catch(() => { if (active) setPosters([]) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [film.id])

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        style={{ width: 'min(620px, 100%)', maxHeight: '82vh', overflowY: 'auto', padding: 22 }}
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">×</button>
        <h2 className="modal-title">Choose a poster</h2>
        <p className="page-sub" style={{ marginBottom: 14 }}>{film.title}</p>

        {loading ? (
          <div className="page-sub">Loading posters…</div>
        ) : posters.length === 0 ? (
          <div className="page-sub">No alternative posters found.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 10 }}>
            {posters.map((poster) => (
              <button
                key={poster.file_path}
                type="button"
                onClick={() => onSelect(poster.file_path)}
                style={{
                  aspectRatio: '2 / 3',
                  borderRadius: 8,
                  overflow: 'hidden',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-surface)',
                  padding: 0,
                }}
              >
                <img
                  src={`https://image.tmdb.org/t/p/w185${poster.file_path}`}
                  alt=""
                  loading="lazy"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const { username } = useParams()
  const navigate = useNavigate()
  const { user, refreshUser, logout } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [details, setDetails] = useState({})
  const [editing, setEditing] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState('')
  const [bio, setBio] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [letterboxd, setLetterboxd] = useState('')
  const [accentColor, setAccentColor] = useState('#6366f1')
  const [favFilms, setFavFilms] = useState([null, null, null, null])
  const [favDirector, setFavDirector] = useState(null)
  const [favActor, setFavActor] = useState(null)
  const [picker, setPicker] = useState(null)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportReason, setReportReason] = useState('spam')
  const [reportDetail, setReportDetail] = useState('')
  const [reportSending, setReportSending] = useState(false)
  const [reportMessage, setReportMessage] = useState('')
  const [posterPicker, setPosterPicker] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState(null)
  const [showAuth, setShowAuth] = useState(false)
  const listParam = searchParams.get('list')
  const [followList, setFollowList] = useState(
    listParam === 'followers' || listParam === 'following' ? listParam : null
  )
  const [sharing, setSharing] = useState(false)
  const [clips, setClips] = useState([])
  const [editClip, setEditClip] = useState(null)
  const [deleteClip, setDeleteClip] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const openFollowList = (mode) => {
    setFollowList(mode)
    const next = new URLSearchParams(searchParams)
    next.set('list', mode)
    setSearchParams(next, { replace: true })
  }

  const closeFollowList = () => {
    setFollowList(null)
    const next = new URLSearchParams(searchParams)
    next.delete('list')
    setSearchParams(next, { replace: true })
  }

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    api.publicProfile(username)
      .then((data) => {
        if (!active) return
        setProfile(data)
        setDisplayName(data.display_name || '')
        setAvatarUrl(data.avatar_url || '')
        setAvatarFile(null)
        setAvatarPreview('')
        setBio(data.bio || '')
        setCity(data.location_city || '')
        setCountry(data.location_country || '')
        setLetterboxd(data.letterboxd_username || '')
        setAccentColor(data.profile_accent_color || '#6366f1')
        setFavFilms([1, 2, 3, 4].map((n) => {
          const id = data[`fav_film_${n}_id`]
          if (!id) return null
          const custom = data[`fav_film_${n}_poster`] || ''
          return { id, title: '', poster_path: custom, custom_poster: custom }
        }))
        setFavDirector(
          data.fav_director_id
            ? { id: data.fav_director_id, name: data.fav_director_name || '', profile_path: '' }
            : null
        )
        setFavActor(
          data.fav_actor_id
            ? { id: data.fav_actor_id, name: data.fav_actor_name || '', profile_path: '' }
            : null
        )
        ;(data.recent || []).forEach((log) => {
          const endpoint = log.media_type === 'tv'
            ? api.showDetails(log.tmdb_id)
            : api.movieDetails(log.tmdb_id)
          endpoint
            .then((d) => {
              const item = log.media_type === 'tv' ? d.show_details : d.movie_details
              if (item && active) setDetails((prev) => ({ ...prev, [log.tmdb_id]: item }))
            })
            .catch(() => {})
        })
      })
      .catch((e) => { if (active) setError(e.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [username])

  useEffect(() => {
    let active = true
    setClips([])
    api.clips({ user: username, limit: 24 })
      .then((d) => { if (active) setClips(d.results || []) })
      .catch(() => { if (active) setClips([]) })
    return () => { active = false }
  }, [username])

  useEffect(() => {
    if (!profile) return
    ;[1, 2, 3, 4].forEach((slot) => {
      const id = profile[`fav_film_${slot}_id`]
      if (!id) return
      api.movieDetails(id)
        .then((data) => {
          const movie = data.movie_details
          if (!movie) return
          setFavFilms((prev) => {
            const next = [...prev]
            const custom = prev[slot - 1]?.custom_poster || ''
            next[slot - 1] = {
              id,
              title: movie.title || '',
              poster_path: custom || movie.poster_path || '',
              custom_poster: custom,
            }
            return next
          })
        })
        .catch(() => {})
    })

    if (profile.fav_director_id) {
      api.personDetails(profile.fav_director_id)
        .then((person) => setFavDirector({
          id: person.id,
          name: person.name || profile.fav_director_name || '',
          profile_path: person.profile_path || '',
        }))
        .catch(() => {})
    }
    if (profile.fav_actor_id) {
      api.personDetails(profile.fav_actor_id)
        .then((person) => setFavActor({
          id: person.id,
          name: person.name || profile.fav_actor_name || '',
          profile_path: person.profile_path || '',
        }))
        .catch(() => {})
    }
  }, [profile])

  const handleClipSaved = (updated) => {
    setClips((cs) => cs.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)))
    setEditClip(null)
  }

  const handleClipDelete = async () => {
    if (!deleteClip) return
    setDeleting(true)
    setDeleteError('')
    try {
      await api.clipDelete(deleteClip.id)
      setClips((cs) => cs.filter((c) => c.id !== deleteClip.id))
      setDeleteClip(null)
    } catch {
      setDeleteError('Failed to delete clip.')
    } finally {
      setDeleting(false)
    }
  }

  function selectAvatar(event) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setSaveMsg('Please choose an image file.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setSaveMsg('Image must be 5MB or smaller.')
      return
    }
    if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
    setSaveMsg(null)
  }

  function clearAvatar() {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    setAvatarFile(null)
    setAvatarPreview('')
    setAvatarUrl('')
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveMsg(null)
    try {
      let nextAvatar = avatarUrl
      if (avatarFile) {
        const uploaded = await api.uploadAvatar(avatarFile)
        nextAvatar = uploaded.avatar_url
        setAvatarUrl(nextAvatar)
        setAvatarFile(null)
        if (avatarPreview) URL.revokeObjectURL(avatarPreview)
        setAvatarPreview('')
      }

      const updated = await api.updateProfile({
        display_name: displayName,
        avatar_url: nextAvatar,
        bio,
        location_city: city,
        location_country: country,
        letterboxd_username: letterboxd,
        profile_accent_color: accentColor,
        fav_film_1_id: favFilms[0]?.id ?? null,
        fav_film_2_id: favFilms[1]?.id ?? null,
        fav_film_3_id: favFilms[2]?.id ?? null,
        fav_film_4_id: favFilms[3]?.id ?? null,
        fav_film_1_poster: favFilms[0]?.custom_poster || null,
        fav_film_2_poster: favFilms[1]?.custom_poster || null,
        fav_film_3_poster: favFilms[2]?.custom_poster || null,
        fav_film_4_poster: favFilms[3]?.custom_poster || null,
        fav_director_id: favDirector?.id ?? null,
        fav_director_name: favDirector?.name || '',
        fav_actor_id: favActor?.id ?? null,
        fav_actor_name: favActor?.name || '',
      })
      setProfile((p) => ({
        ...p,
        ...updated,
        display_name: updated.display_name || p.username,
        avatar_url: updated.avatar_url || '',
      }))
      refreshUser?.()
      setSaveMsg('Saved!')
      setEditing(false)
    } catch (err) {
      let msg = 'Failed to save'
      try {
        const parsed = JSON.parse(String(err?.message || ''))
        const first = parsed && typeof parsed === 'object' ? Object.values(parsed).flat()[0] : null
        if (first) msg = `Failed to save: ${first}`
      } catch { /* keep generic */ }
      setSaveMsg(msg)
    } finally {
      setSaving(false)
    }
  }

  function handlePickerSelect(item) {
    if (!picker) return
    if (picker.type === 'film') {
      setFavFilms((prev) => {
        const next = [...prev]
        next[picker.index] = {
          id: item.id,
          title: item.title || '',
          poster_path: item.poster_path || '',
        }
        return next
      })
    } else {
      const person = {
        id: item.id,
        name: item.name || '',
        profile_path: item.profile_path || '',
      }
      if (picker.role === 'director') setFavDirector(person)
      else setFavActor(person)
    }
    setPicker(null)
  }

  function handlePosterSelect(filePath) {
    if (posterPicker === null) return
    setFavFilms((prev) => {
      const next = [...prev]
      if (!next[posterPicker]) return prev
      next[posterPicker] = {
        ...next[posterPicker],
        poster_path: filePath,
        custom_poster: filePath,
      }
      return next
    })
    setPosterPicker(null)
  }

  if (loading) return <div className="page"><Loading /></div>
  if (error || !profile) return <div className="page"><ErrorState message={error || 'Profile not found'} /></div>

  async function removeFriend() {
    if (!window.confirm(`Remove ${profile.display_name || profile.username} from your friends?`)) return
    try {
      await api.removeFriend(profile.username)
      setProfile((prev) => ({
        ...prev,
        friend_status: 'none',
        friend_request_id: null,
        is_following: false,
      }))
    } catch {
      // keep the button on failure
    }
  }

  async function submitReport(event) {
    event.preventDefault()
    if (reportSending) return
    setReportSending(true)
    setReportMessage('')
    try {
      await api.reportUser(profile.username, { reason: reportReason, detail: reportDetail })
      setReportMessage('Report submitted. Our team will review it.')
      setReportDetail('')
    } catch {
      setReportMessage('Could not submit the report. Try again.')
    } finally {
      setReportSending(false)
    }
  }

  async function sendFriendRequest() {
    try {
      const result = await api.sendFriendRequest(profile.username)
      if (result?.status === 'friends') {
        setProfile((prev) => ({ ...prev, friend_status: 'friends', is_following: true }))
      } else {
        setProfile((prev) => ({ ...prev, friend_status: 'pending_outgoing' }))
      }
    } catch {
      // keep the button available on failure
    }
  }

  async function acceptFriendRequest() {
    if (!profile.friend_request_id) return
    try {
      await api.acceptFriendRequest(profile.friend_request_id)
      setProfile((prev) => ({
        ...prev,
        friend_status: 'friends',
        friend_request_id: null,
        is_following: true,
      }))
    } catch {
      // keep the button on failure
    }
  }

  const initial = (profile.display_name || profile.username).charAt(0).toUpperCase()
  const isVip = Boolean(user?.is_vip || profile?.is_vip)
  const backdrops = Object.values(details)
    .map((d) => d.backdrop_path)
    .filter(Boolean)
    .slice(0, 3)

  return (
    <div className="page profile-page">
      <PageBanner
        title={(
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            {profile.is_founding_member && <FoundingBadge size={18} />}
            {profile.is_vip && <VipBadge size={14} />}
            {profile.display_name}
          </span>
        )}
        subtitle={`@${profile.username}`}
        eyebrow="Member"
        backdropPaths={backdrops}
        actions={
          <>
            <button className="btn btn-ghost btn--sm" onClick={() => setSharing(true)}>
              <Icon name="share" size={14} />
              Share
            </button>
            {profile.is_me && (
              <>
                <button className="btn btn-ghost btn--sm" onClick={() => setEditing((e) => !e)}>
                  {editing ? 'Cancel' : 'Edit profile'}
                </button>
                {user?.is_admin && (
                  <Link to="/admin" className="btn btn-ghost btn--sm">
                    <Icon name="shield" size={14} />
                    Admin
                  </Link>
                )}
                <button className="btn btn-ghost btn--sm" onClick={logout}>
                  <Icon name="logOut" size={14} />
                  Sign out
                </button>
              </>
            )}
            {!profile.is_me && (
              <>
                {profile.friend_status === 'pending_incoming' ? (
                  <button className="btn btn--accent btn--sm" onClick={acceptFriendRequest}>
                    Accept friend request
                  </button>
                ) : profile.friend_status === 'pending_outgoing' ? (
                  <button className="btn btn-ghost btn--sm" disabled>
                    Request sent
                  </button>
                ) : profile.friend_status === 'friends' ? (
                  <button className="btn btn-ghost btn--sm" onClick={removeFriend}>
                    Remove friend
                  </button>
                ) : (
                  <button
                    className="btn btn--accent btn--sm"
                    onClick={() => {
                      if (!user) {
                        navigate('/login')
                        return
                      }
                      sendFriendRequest()
                    }}
                  >
                    Send friend request
                  </button>
                )}
                <button
                  className="btn btn-ghost btn--sm"
                  onClick={() => {
                    setReportMessage('')
                    setReportOpen(true)
                  }}
                >
                  <Icon name="flag" size={13} /> Report
                </button>
              </>
            )}
          </>
        }
      >
        <div className="profile-banner-avatar">
          {profile.avatar_url ? (
            <img
              className="profile-avatar"
              src={profile.avatar_url}
              alt={profile.display_name}
              style={{
                borderColor: profile.profile_accent_color || '#6366f1',
                boxShadow: `0 0 0 3px ${profile.profile_accent_color || '#6366f1'}33`,
              }}
            />
          ) : (
            <span
              className="profile-avatar profile-avatar--initial"
              style={{
                borderColor: profile.profile_accent_color || '#6366f1',
                boxShadow: `0 0 0 3px ${profile.profile_accent_color || '#6366f1'}33`,
              }}
            >
              {initial}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 14 }}>
          {(profile.location_city || profile.location_country) && (
            <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              📍 {[profile.location_city, profile.location_country].filter(Boolean).join(', ')}
            </span>
          )}
          {profile.letterboxd_username && (
            <a
              className="btn btn-ghost btn--sm"
              href={`https://letterboxd.com/${profile.letterboxd_username}`}
              target="_blank"
              rel="noreferrer"
            >
              Letterboxd
            </a>
          )}
        </div>

        {profile.bio && (
          <p style={{ marginTop: 10, maxWidth: 620, color: 'var(--text-soft)', fontSize: '0.9rem', lineHeight: 1.45 }}>
            {profile.bio}
          </p>
        )}
      </PageBanner>

      <section className="profile-block profile-block--films">
        <h2 className="profile-section-title">Top 4 favorite films</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }}>
          {favFilms.map((film, index) => (
            <button
              key={index}
              type="button"
              className="profile-film-card"
              onClick={() => { if (profile.is_me) setPicker({ type: 'film', index }) }}
              disabled={!profile.is_me}
              style={{
                position: 'relative',
                aspectRatio: '2 / 3',
                borderRadius: 10,
                overflow: 'hidden',
                border: '1px solid var(--border)',
                background: 'var(--bg-surface)',
                display: 'grid',
                placeItems: 'center',
                color: 'var(--text-muted)',
              }}
            >
              {film?.poster_path ? (
                <img
                  src={`https://image.tmdb.org/t/p/w342${film.poster_path}`}
                  alt={film.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <span style={{ fontSize: '0.75rem', padding: 6, textAlign: 'center' }}>
                  {film ? 'Loading…' : profile.is_me ? '+ Add film' : 'No film'}
                </span>
              )}
            </button>
          ))}
        </div>
      </section>

      <section className="profile-block profile-block--favorites">
        <h2 className="profile-section-title">Favorites</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          {[
            { key: 'director', label: 'Favorite Director', person: favDirector },
            { key: 'actor', label: 'Favorite Actor', person: favActor },
          ].map(({ key, label, person }) => (
            <button
              key={key}
              type="button"
              className="profile-fav-card"
              onClick={() => { if (profile.is_me) setPicker({ type: 'person', role: key }) }}
              disabled={!profile.is_me}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                textAlign: 'left',
                padding: 14,
                background: 'var(--bg-elev)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
              }}
            >
              {person?.profile_path ? (
                <img
                  src={`https://image.tmdb.org/t/p/w185${person.profile_path}`}
                  alt={person.name}
                  style={{ width: 56, height: 56, borderRadius: 999, objectFit: 'cover', flex: 'none' }}
                />
              ) : (
                <span className="avatar avatar--initial" style={{ width: 56, height: 56, flex: 'none' }}>
                  {(person?.name || '?').charAt(0).toUpperCase()}
                </span>
              )}
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                  {label}
                </span>
                <span style={{ display: 'block', fontWeight: 800 }}>
                  {person?.name || (profile.is_me ? `Add ${label.toLowerCase()}` : '—')}
                </span>
              </span>
            </button>
          ))}
        </div>
      </section>

            {editing && profile.is_me && (
        <div className="modal-backdrop" onClick={() => setEditing(false)}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
            style={{ width: 'min(560px, 100%)', maxHeight: '86vh', overflowY: 'auto', padding: 24 }}
          >
            <button type="button" className="modal-close" onClick={() => setEditing(false)} aria-label="Close">
              ×
            </button>
            <h2 className="modal-title">Edit profile</h2>

            <label className="profile-edit__label">Display name</label>
            <input
              className="profile-edit__input"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              maxLength={100}
              placeholder="Your display name"
            />

            <label className="profile-edit__label">Bio</label>
            <textarea
              className="profile-edit__input"
              value={bio}
              onChange={(event) => setBio(event.target.value.slice(0, 250))}
              rows={3}
              maxLength={250}
              placeholder="A line or two about your taste in film"
            />

            <label className="profile-edit__label">Letterboxd username</label>
            <input
              className="profile-edit__input"
              value={letterboxd}
              onChange={(event) => setLetterboxd(event.target.value)}
              maxLength={50}
              placeholder="your-handle"
            />

            <label className="profile-edit__label">Profile accent</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="color"
                value={accentColor}
                onChange={(event) => setAccentColor(event.target.value)}
                aria-label="Profile accent color"
                style={{ width: 44, height: 36, padding: 2, borderRadius: 8, background: 'var(--bg-base)', border: '1px solid var(--border)' }}
              />
              <input
                className="profile-edit__input"
                value={accentColor}
                onChange={(event) => setAccentColor(event.target.value)}
                maxLength={20}
                placeholder="#6366f1"
                style={{ flex: 1 }}
              />
            </div>

            <label className="profile-edit__label">Profile photo</label>
            <div className="avatar-upload">
              <div className="avatar-upload__preview">
                {(avatarPreview || avatarUrl) ? (
                  <img
                    className="profile-avatar"
                    src={avatarPreview || avatarUrl}
                    alt="Profile preview"
                    style={{ borderColor: accentColor }}
                  />
                ) : (
                  <span className="profile-avatar profile-avatar--initial" style={{ borderColor: accentColor }}>
                    {(displayName || profile.username).charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="avatar-upload__actions">
                <label className="btn btn--accent btn--sm avatar-upload__label" htmlFor="avatar-upload-input">
                  Upload photo
                </label>
                <input
                  id="avatar-upload-input"
                  className="avatar-upload__input"
                  type="file"
                  accept="image/*"
                  onChange={selectAvatar}
                />
                <span className="avatar-upload__hint">JPG, PNG, WebP or GIF · max 5MB</span>
                {(avatarPreview || avatarUrl) && (
                  <button type="button" className="avatar-upload__clear" onClick={clearAvatar}>
                    Remove photo
                  </button>
                )}
              </div>
            </div>

            <label className="profile-edit__label">Top 4 favorite films</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {favFilms.map((film, index) => (
                <div key={index} style={{ display: 'grid', gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => setPicker({ type: 'film', index })}
                    style={{
                      aspectRatio: '2 / 3',
                      borderRadius: 8,
                      overflow: 'hidden',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-surface)',
                      display: 'grid',
                      placeItems: 'center',
                      color: 'var(--text-muted)',
                      fontSize: '0.7rem',
                      padding: 4,
                    }}
                  >
                    {film?.poster_path ? (
                      <img
                        src={`https://image.tmdb.org/t/p/w185${film.poster_path}`}
                        alt={film.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <span>{film?.title || '+ Add'}</span>
                    )}
                  </button>

                  {film?.id && (
                    isVip ? (
                      <button
                        type="button"
                        className="btn btn-ghost btn--sm"
                        onClick={() => setPosterPicker(index)}
                        style={{ padding: '4px 6px', fontSize: '0.64rem' }}
                      >
                        Change Poster
                      </button>
                    ) : (
                      <span
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          color: 'var(--text-dim)',
                          fontSize: '0.6rem',
                          lineHeight: 1.2,
                        }}
                      >
                        <Icon name="lock" size={10} />
                        VIP Perk: Unlock Custom Poster Selection
                      </span>
                    )
                  )}
                </div>
              ))}
            </div>

            <label className="profile-edit__label">Favorites</label>
            <div style={{ display: 'grid', gap: 8 }}>
              {[
                { key: 'director', label: 'Favorite Director', person: favDirector },
                { key: 'actor', label: 'Favorite Actor', person: favActor },
              ].map(({ key, label, person }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPicker({ type: 'person', role: key })}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    padding: '10px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-surface)',
                    textAlign: 'left',
                  }}
                >
                  <span>
                    <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)' }}>{label}</span>
                    <span style={{ fontWeight: 700 }}>{person?.name || 'Choose…'}</span>
                  </span>
                  <Icon name="search" size={15} />
                </button>
              ))}
            </div>

            <div className="modal-actions" style={{ marginTop: 20 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setEditing(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn--accent" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
            {saveMsg && <p className="profile-edit__msg">{saveMsg}</p>}
          </div>
        </div>
      )}


      <div className="profile-stats">
        <div className="profile-stat">
          <span className="profile-stat__value">{profile.stats.total_logged}</span>
          <span className="profile-stat__label">Logged</span>
        </div>
        <div className="profile-stat">
          <span className="profile-stat__value">
            {profile.stats.avg_rating != null ? Number(profile.stats.avg_rating).toFixed(1) : '–'}
          </span>
          <span className="profile-stat__label">Avg rating</span>
        </div>
        <div className="profile-stat">
          <span className="profile-stat__value">{profile.stats.this_year}</span>
          <span className="profile-stat__label">This year</span>
        </div>
        <div className="profile-stat">
          <span className="profile-stat__value">{profile.stats.reviews ?? 0}</span>
          <span className="profile-stat__label">Reviews</span>
        </div>
        <button
          type="button"
          className="profile-stat profile-stat--btn"
          onClick={() => openFollowList('followers')}
          title={`View ${profile.username}'s followers`}
        >
          <span className="profile-stat__value">{profile.followers_count ?? 0}</span>
          <span className="profile-stat__label">Followers</span>
        </button>
        <button
          type="button"
          className="profile-stat profile-stat--btn"
          onClick={() => openFollowList('following')}
          title={`View who ${profile.username} follows`}
        >
          <span className="profile-stat__value">{profile.following_count ?? 0}</span>
          <span className="profile-stat__label">Following</span>
        </button>
      </div>

      {followList && (
        <FollowListModal
          username={profile.username}
          mode={followList}
          onClose={closeFollowList}
        />
      )}

      {sharing && (
        <ShareModal profile={profile} onClose={() => setSharing(false)} />
      )}

      {clips.length > 0 && (
        <section className="profile-clips">
          <h2 className="profile-section-title">Clips</h2>
          <MediaRail>
            {clips.map((clip) => (
              <ClipCard
                key={clip.id}
                clip={clip}
                caption
                onEdit={profile.is_me ? () => setEditClip(clip) : undefined}
                onDelete={profile.is_me ? () => setDeleteClip(clip) : undefined}
              />
            ))}
          </MediaRail>
        </section>
      )}

      <section className="profile-block profile-block--activity">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <h2 className="profile-section-title">Recent activity</h2>
        <Link to="/diary" className="section-action">
          View all <Icon name="arrowRight" size={12} />
        </Link>
      </div>

      {profile.recent.length === 0 ? (
        <p className="profile-empty">No diary entries yet.</p>
      ) : (
        <div className="diary-date-entries profile-activity-list">
          {profile.recent.map((log) => {
            const item = details[log.tmdb_id]
            const title = item?.title || item?.name || ''
            const poster = item?.poster_path
            const mediaPath = log.media_type === 'tv' ? `/show/${log.tmdb_id}` : `/movie/${log.tmdb_id}`
            const link = log.review ? `/review/${log.id}` : mediaPath
            return (
              <Link key={log.id} to={link} className="diary-entry">
                <div className="diary-entry__poster">
                  {poster ? (
                    <img src={`https://image.tmdb.org/t/p/w342${poster}`} alt={title} loading="lazy" />
                  ) : (
                    <div className="diary-entry__poster--placeholder">{log.media_type === 'tv' ? '📺' : '🎬'}</div>
                  )}
                </div>
                <div className="diary-entry__info">
                  <h4 className="diary-entry__title">
                    {title || <span className="skeleton skeleton-line short" />}
                  </h4>
                  <div className="diary-entry__meta">
                    <span className="diary-entry__type">{log.media_type === 'tv' ? 'TV Show' : 'Movie'}</span>
                    {log.rating != null && <StarRating value={Number(log.rating)} readonly size="sm" />}
                  </div>
                  {log.review && <p className="diary-entry__review">{log.review}</p>}
                </div>
              </Link>
            )
          })}
        </div>
      )}
      </section>

      {editClip && (
        <ClipEditModal
          clip={editClip}
          onClose={() => setEditClip(null)}
          onSaved={handleClipSaved}
        />
      )}

      {deleteClip && (
        <div className="modal-backdrop" onClick={() => { if (!deleting) setDeleteClip(null) }}>
          <div
            className="modal clip-delete-modal"
            role="alertdialog"
            aria-modal="true"
            aria-label="Delete clip"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="modal-title">Delete this clip?</h2>
            <p className="clip-delete-modal__text">
              {deleteClip.caption
                ? `“${deleteClip.caption.slice(0, 80)}${deleteClip.caption.length > 80 ? '…' : ''}”`
                : 'This clip'}{' '}
              will be permanently removed. This can't be undone.
            </p>
            {deleteError && <p className="form-error">{deleteError}</p>}
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setDeleteClip(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn--danger"
                onClick={handleClipDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting…' : 'Delete clip'}
              </button>
            </div>
          </div>
        </div>
      )}
      {picker && (
        <TmdbPicker
          key={`${picker.type}-${picker.index ?? picker.role}`}
          target={picker}
          onClose={() => setPicker(null)}
          onSelect={handlePickerSelect}
        />
      )}

      {posterPicker !== null && favFilms[posterPicker] && (
        <PosterPicker
          film={favFilms[posterPicker]}
          onClose={() => setPosterPicker(null)}
          onSelect={handlePosterSelect}
        />
      )}
      {reportOpen && (
        <div className="modal-backdrop" onClick={() => setReportOpen(false)}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            style={{ width: 'min(440px, 100%)', padding: 24 }}
            onClick={(event) => event.stopPropagation()}
          >
            <button type="button" className="modal-close" onClick={() => setReportOpen(false)} aria-label="Close">×</button>
            <h2 className="modal-title">Report @{profile.username}</h2>
            <form onSubmit={submitReport} style={{ display: 'grid', gap: 12 }}>
              <div className="form-group">
                <label htmlFor="report-reason">Reason</label>
                <select
                  id="report-reason"
                  className="auth-input"
                  value={reportReason}
                  onChange={(event) => setReportReason(event.target.value)}
                >
                  <option value="spam">Spam</option>
                  <option value="harassment">Harassment</option>
                  <option value="impersonation">Impersonation</option>
                  <option value="inappropriate">Inappropriate profile</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="report-detail">Details (optional)</label>
                <textarea
                  id="report-detail"
                  className="auth-input"
                  rows={3}
                  maxLength={1000}
                  value={reportDetail}
                  onChange={(event) => setReportDetail(event.target.value)}
                  placeholder="What happened?"
                />
              </div>
              {reportMessage && <p className="page-sub">{reportMessage}</p>}
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setReportOpen(false)}>Close</button>
                <button type="submit" className="btn btn--danger" disabled={reportSending}>
                  {reportSending ? 'Submitting…' : 'Submit report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <AuthPrompt open={showAuth} onClose={() => setShowAuth(false)} />
    </div>
  )
}
