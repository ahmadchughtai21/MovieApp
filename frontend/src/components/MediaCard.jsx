import { Link } from 'react-router-dom'
import { buildImageUrl } from '../lib/image'
import { useImageConfig } from '../lib/imageConfig'
import { formatDate } from '../lib/format'

export default function MediaCard({ item, to, kind = 'movie', compact = false }) {
  const config = useImageConfig()
  const title = item.title || item.name || item.original_name || 'Untitled'
  const date = item.release_date || item.first_air_date
  const imagePath = kind === 'person' ? item.profile_path : item.poster_path
  const image = buildImageUrl(config, imagePath, kind === 'person' ? 'profile' : 'poster')
  const rating = item.vote_average ? item.vote_average.toFixed(1) : 'NR'

  return (
    <Link to={to} className={`media-card${compact ? ' compact' : ''}`}>
      <div className="media-poster">
        {image ? <img src={image} alt={title} loading="lazy" /> : <div className="poster-fallback">No image</div>}
        <div className="media-badge">{kind.toUpperCase()}</div>
      </div>
      <div className="media-info">
        <div className="media-title" title={title}>{title}</div>
        <div className="media-meta">
          <span>{date ? formatDate(date) : 'Unknown date'}</span>
          <span className="media-rating">{rating}</span>
        </div>
      </div>
    </Link>
  )
}
