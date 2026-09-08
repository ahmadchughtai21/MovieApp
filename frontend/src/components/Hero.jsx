import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { buildImageUrl } from '../lib/image'
import { useImageConfig } from '../lib/imageConfig'
import Icon from './Icon'

export default function Hero({ items = [], kind = 'movie' }) {
  const config = useImageConfig()
  const [current, setCurrent] = useState(0)
  const [fading, setFading] = useState(false)
  const timeoutRef = useRef(null)

  const advance = useCallback(() => {
    if (items.length <= 1) return
    setFading(true)
    timeoutRef.current = setTimeout(() => {
      setCurrent((i) => (i + 1) % items.length)
      setFading(false)
    }, 600)
  }, [items.length])

  useEffect(() => {
    if (items.length <= 1) return
    const timer = setInterval(advance, 5000)
    return () => { clearInterval(timer); clearTimeout(timeoutRef.current) }
  }, [advance, items.length])

  if (!items.length) return null

  const item = items[current]
  const title = item.title || item.name
  const backdrop = buildImageUrl(config, item.backdrop_path, 'backdrop', 'w1280')
  const date = item.release_date || item.first_air_date
  const to = kind === 'show' ? `/shows/${item.id}` : `/movies/${item.id}`
  const year = date ? new Date(date).getFullYear() : null
  const rating = item.vote_average ? item.vote_average.toFixed(1) : null
  const overview = item.overview

  const go = (i) => {
    clearTimeout(timeoutRef.current)
    setFading(true)
    setTimeout(() => {
      setCurrent(i)
      setFading(false)
    }, 400)
  }

  return (
    <section className="hero" aria-label="Featured content">
      <div
        className={`hero-bg${fading ? ' fade-out' : ''}`}
        style={{ backgroundImage: `url(${backdrop})` }}
      />
      <div className="hero-overlay" />

      <div className={`hero-content${fading ? ' fade-out' : ''}`} key={item.id}>
        <span className="hero-eyebrow">Trending {items.length > 1 ? `#${current + 1}` : 'now'}</span>
        <h1>{title}</h1>

        <div className="hero-meta">
          {year ? <span>{year}</span> : null}
          {year && rating ? <span className="dot" /> : null}
          {rating ? (
            <span className="hero-rating">
              <Icon name="star" size={16} />
              {rating}
            </span>
          ) : null}
          {item.genres?.length ? (
            <>
              <span className="dot" />
              <span>{item.genres.slice(0, 2).map((g) => g.name).join(' / ')}</span>
            </>
          ) : null}
        </div>

        {overview ? <p className="hero-overview">{overview}</p> : null}

        <div className="hero-actions">
          <Link to={to} className="btn btn-primary">
            <Icon name="play" size={16} />
            Watch now
          </Link>
          <Link to={to} className="btn btn-ghost">
            More info
            <Icon name="arrowRight" size={16} />
          </Link>
        </div>
      </div>

      {items.length > 1 ? (
        <div className="hero-dots">
          {items.map((_, i) => (
            <button
              key={i}
              className={`hero-dot${i === current ? ' active' : ''}`}
              onClick={() => go(i)}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      ) : null}
    </section>
  )
}
