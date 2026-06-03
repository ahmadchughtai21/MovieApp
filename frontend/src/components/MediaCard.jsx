import { Link } from 'react-router-dom'
import { buildImageUrl } from '../lib/image'
import { useImageConfig } from '../lib/imageConfig'
import { formatDate } from '../lib/format'
import Icon from './Icon'

const KIND_LABEL = {
  movie: 'Movie',
  show: 'Series',
  person: 'Person'
}

export default function MediaCard({ item, to, kind = 'movie' }) {
  const config = useImageConfig()
  if (!item) return null

  const title = item.title || item.name || item.original_name || 'Untitled'
  const date = item.release_date || item.first_air_date
  const imagePath = kind === 'person' ? item.profile_path : item.poster_path
  const image = buildImageUrl(config, imagePath, kind === 'person' ? 'profile' : 'poster')
  const rating = item.vote_average ? item.vote_average.toFixed(1) : null
  const year = date ? new Date(date).getFullYear() : null

  return (
    <Link to={to} className="media-card">
      <div className="media-poster">
        {image ? (
          <img src={image} alt={title} loading="lazy" />
        ) : (
          <div className="poster-fallback">No image</div>
        )}
        <span className="media-badge">{KIND_LABEL[kind] || 'Movie'}</span>
        {rating && kind !== 'person' ? (
          <span className="media-rating">
            <Icon name="star" size={11} />
            {rating}
          </span>
        ) : null}
      </div>
      <div className="media-info">
        <div className="media-title" title={title}>{title}</div>
        <div className="media-meta">
          {year ? <span>{year}</span> : <span>—</span>}
        </div>
      </div>
    </Link>
  )
}
