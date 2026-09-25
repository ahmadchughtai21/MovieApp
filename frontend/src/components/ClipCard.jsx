import { Link } from 'react-router-dom'
import Icon from './Icon'

function timeAgo(dateString) {
  const date = new Date(dateString)
  const now = new Date()
  const diff = Math.floor((now - date) / 1000)
  if (diff < 60) return 'now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
}

export default function ClipCard({ clip, caption = false, onEdit, onDelete }) {
  const creator = `@${clip.user?.username || 'member'}`
  const infoLine = caption ? (clip.caption || 'Untitled clip') : creator

  return (
    <div className="media-card clip-card-mini">
      <Link
        to={`/clips/${clip.id}`}
        className="clip-card-link"
        aria-label={`Open clip by ${clip.user?.username || 'member'}`}
      >
        <div className="clip-card-thumb">
          <video src={clip.video_url} playsInline muted loop preload="metadata" />
          <div className="clip-card-overlay">
            <div className="clip-card-stats">
              <span><Icon name="heart" size={12} /> {clip.like_count || 0}</span>
              <span><Icon name="chat" size={12} /> {clip.comment_count || 0}</span>
            </div>
          </div>
        </div>
        <div className="clip-card-info">
          <p className="clip-card-creator">{infoLine}</p>
          <p className="clip-card-time">{timeAgo(clip.created_at)}</p>
        </div>
      </Link>
      {(onEdit || onDelete) && (
        <div className="clip-card-manage">
          {onEdit && (
            <button
              type="button"
              className="clip-manage-btn"
              aria-label="Edit clip"
              title="Edit clip"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit() }}
            >
              <Icon name="pencil" size={13} />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              className="clip-manage-btn clip-manage-btn--danger"
              aria-label="Delete clip"
              title="Delete clip"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete() }}
            >
              <Icon name="trash" size={13} />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
