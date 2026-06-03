import { Link } from 'react-router-dom'
import { buildImageUrl } from '../lib/image'
import { useImageConfig } from '../lib/imageConfig'
import { formatDate } from '../lib/format'
import Icon from './Icon'

export default function Hero({ item, kind = 'movie' }) {
  const config = useImageConfig()
  if (!item) return null

  const title = item.title || item.name
  const backdrop = buildImageUrl(config, item.backdrop_path, 'backdrop')
  const date = item.release_date || item.first_air_date
  const to = kind === 'show' ? `/shows/${item.id}` : `/movies/${item.id}`
  const year = date ? new Date(date).getFullYear() : null
  const rating = item.vote_average ? item.vote_average.toFixed(1) : null

  return (
    <section className="hero" aria-label={`Featured: ${title}`}>
      {backdrop ? (
        <div className="hero-bg" style={{ backgroundImage: `url(${backdrop})` }} />
      ) : (
        <div className="hero-bg" style={{ background: 'linear-gradient(135deg, #1c1c1f, #09090b)' }} />
      )}
      <div className="hero-overlay" />

      <div className="hero-content">
        <span className="hero-eyebrow">Trending {kind === 'show' ? 'this week' : 'now'}</span>
        <h1>{title}</h1>

        <div className="hero-meta">
          {year ? <span>{year}</span> : null}
          {year && rating ? <span className="dot" /> : null}
          {rating ? (
            <span className="hero-rating">
              <Icon name="star" size={14} />
              {rating}
            </span>
          ) : null}
          {item.genres?.length ? (
            <>
              <span className="dot" />
              <span>{item.genres.slice(0, 2).map((g) => g.name).join(' · ')}</span>
            </>
          ) : null}
        </div>

        {item.overview ? <p className="hero-overview">{item.overview}</p> : null}

        <div className="hero-actions">
          <Link to={to} className="btn btn-primary">
            <Icon name="play" size={12} />
            Watch now
          </Link>
          <Link to={to} className="btn btn-ghost">
            More info
            <Icon name="arrowRight" size={14} />
          </Link>
        </div>
      </div>
    </section>
  )
}
