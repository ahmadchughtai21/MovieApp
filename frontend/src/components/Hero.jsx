import { Link } from 'react-router-dom'
import { buildImageUrl } from '../lib/image'
import { useImageConfig } from '../lib/imageConfig'
import { formatDate } from '../lib/format'

export default function Hero({ item, kind = 'movie' }) {
  const config = useImageConfig()
  if (!item) return null
  const title = item.title || item.name
  const backdrop = buildImageUrl(config, item.backdrop_path, 'backdrop')
  const date = item.release_date || item.first_air_date
  const to = kind === 'show' ? `/shows/${item.id}` : `/movies/${item.id}`

  return (
    <section className="hero">
      <div className="hero-bg" style={{ backgroundImage: `url(${backdrop})` }} />
      <div className="hero-content">
        <div className="hero-tag">Trending this week</div>
        <h1>{title}</h1>
        <p className="hero-sub">
          {formatDate(date)} · Rating {item.vote_average?.toFixed(1) || 'NR'}
        </p>
        <p className="hero-overview">{item.overview}</p>
        <div className="hero-actions">
          <Link to={to} className="btn primary">Watch now</Link>
          <Link to={to} className="btn ghost">View details</Link>
        </div>
      </div>
    </section>
  )
}
