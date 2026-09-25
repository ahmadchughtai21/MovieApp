import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
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
import { PRESET_AVATARS, isPresetAvatar } from '../lib/avatars'

export default function ProfilePage() {
  const { username } = useParams()
  const { user, refreshUser, logout } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [details, setDetails] = useState({})
  const [editing, setEditing] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
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

  const handleSave = async () => {
    setSaving(true)
    setSaveMsg(null)
    try {
      const updated = await api.updateProfile({ display_name: displayName, avatar_url: avatarUrl })
      setProfile((p) => ({
        ...p,
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

  if (loading) return <div className="page"><Loading /></div>
  if (error || !profile) return <div className="page"><ErrorState message={error || 'Profile not found'} /></div>

  const initial = (profile.display_name || profile.username).charAt(0).toUpperCase()
  const backdrops = Object.values(details)
    .map((d) => d.backdrop_path)
    .filter(Boolean)
    .slice(0, 3)

  return (
    <div className="page profile-page">
      <PageBanner
        title={profile.display_name}
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
              <button
                className={`btn ${profile.is_following ? 'btn-ghost' : 'btn--accent'} btn--sm`}
                onClick={async () => {
                  if (!user) {
                    setShowAuth(true)
                    return
                  }
                  try {
                    const res = await api.followToggle(profile.username)
                    setProfile((p) => ({ ...p, is_following: res.following, followers_count: res.followers_count }))
                  } catch { /* ignore */ }
                }}
              >
                {profile.is_following ? 'Following' : 'Follow'}
              </button>
            )}
          </>
        }
      >
        <div className="profile-banner-avatar">
          {profile.avatar_url ? (
            <img className="profile-avatar" src={profile.avatar_url} alt={profile.display_name} />
          ) : (
            <span className="profile-avatar profile-avatar--initial">{initial}</span>
          )}
        </div>
      </PageBanner>

      {editing && profile.is_me && (
        <div className="profile-edit">
          <label className="profile-edit__label">Display name</label>
          <input
            className="profile-edit__input"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={100}
            placeholder="Your display name"
          />

          <label className="profile-edit__label">Avatar</label>
          <div className="avatar-picker" role="radiogroup" aria-label="Choose avatar">
            <div className="avatar-picker__preview">
              {avatarUrl ? (
                <img className="profile-avatar" src={avatarUrl} alt="Selected avatar" />
              ) : (
                <span className="profile-avatar profile-avatar--initial">
                  {(displayName || profile.username).charAt(0).toUpperCase()}
                </span>
              )}
              <div className="avatar-picker__preview-meta">
                <span className="avatar-picker__preview-title">
                  {isPresetAvatar(avatarUrl)
                    ? PRESET_AVATARS.find((a) => a.src === avatarUrl)?.label
                    : avatarUrl
                      ? 'Custom image'
                      : 'Initials'}
                </span>
                <button
                  type="button"
                  className="avatar-picker__clear"
                  onClick={() => setAvatarUrl('')}
                  disabled={!avatarUrl}
                >
                  Use initials
                </button>
              </div>
            </div>

            <div className="avatar-picker__grid">
              {PRESET_AVATARS.map((preset) => {
                const selected = avatarUrl === preset.src
                return (
                  <button
                    key={preset.id}
                    type="button"
                    className={`avatar-picker__item${selected ? ' avatar-picker__item--active' : ''}`}
                    role="radio"
                    aria-checked={selected}
                    aria-label={preset.label}
                    title={preset.label}
                    onClick={() => setAvatarUrl(preset.src)}
                  >
                    <img src={preset.src} alt="" width="48" height="48" />
                  </button>
                )
              })}
            </div>

            <label className="profile-edit__label avatar-picker__custom-label" htmlFor="avatar-custom-url">
              Or paste an image URL
            </label>
            <input
              id="avatar-custom-url"
              className="profile-edit__input"
              value={isPresetAvatar(avatarUrl) ? '' : avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://..."
              disabled={isPresetAvatar(avatarUrl)}
            />
          </div>

          <button className="btn btn--accent" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
          {saveMsg && <p className="profile-edit__msg">{saveMsg}</p>}
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

      <h2 className="profile-section-title">Recent activity</h2>

      {profile.recent.length === 0 ? (
        <p className="profile-empty">No diary entries yet.</p>
      ) : (
        <div className="diary-date-entries">
          {profile.recent.map((log) => {
            const item = details[log.tmdb_id]
            const title = item?.title || item?.name || ''
            const poster = item?.poster_path
            const link = log.media_type === 'tv' ? `/show/${log.tmdb_id}` : `/movie/${log.tmdb_id}`
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
      <AuthPrompt open={showAuth} onClose={() => setShowAuth(false)} />
    </div>
  )
}
