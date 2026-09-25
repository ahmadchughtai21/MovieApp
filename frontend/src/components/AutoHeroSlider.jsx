import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { buildImageUrl } from '../lib/image'
import { useImageConfig } from '../lib/imageConfig'
import Icon from './Icon'
import { formatRuntime, compactNumber } from '../lib/format'

const INTERVAL = 7000
const MAX_DOTS = 7

function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export default function AutoHeroSlider({ items, kind = 'movie', limit = 6 }) {
  const config = useImageConfig()
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [progress, setProgress] = useState(0)
  const reduced = useRef(false)

  const slides = useMemo(() => {
    if (!Array.isArray(items)) return []
    const seen = new Set()
    return items
      .filter((item) => {
        if (!item || !item.backdrop_path || !(item.title || item.name)) return false
        const key = `${item.__kind || kind}-${item.id}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .slice(0, limit)
  }, [items, limit, kind])

  useEffect(() => {
    reduced.current = prefersReducedMotion()
  }, [])

  useEffect(() => {
    setIndex(0)
    setProgress(0)
  }, [slides.length])

  useEffect(() => {
    if (slides.length <= 1 || paused || reduced.current) return undefined

    let start = performance.now()
    let frame

    function tick(now) {
      const elapsed = now - start
      const pct = Math.min(elapsed / INTERVAL, 1)
      setProgress(pct)
      if (pct >= 1) {
        setIndex((i) => (i + 1) % slides.length)
        start = now
        setProgress(0)
      }
      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [slides.length, paused, index])

  if (slides.length === 0) return null

  const item = slides[Math.min(index, slides.length - 1)]
  const itemKind = item.__kind || (item.first_air_date && !item.release_date ? 'show' : kind)
  const kindLabel = itemKind === 'show' ? 'Series' : 'Movie'
  const title = item.title || item.name || ''
  const date = item.release_date || item.first_air_date
  const year = date ? new Date(date).getFullYear() : null
  const rating = item.vote_average ? item.vote_average.toFixed(1) : null
  const overview = item.overview || ''
  const detailPath = itemKind === 'show' ? `/show/${item.id}` : `/movie/${item.id}`
  const backdrop = buildImageUrl(config, item.backdrop_path, 'backdrop', 'original')
  const poster = buildImageUrl(config, item.poster_path, 'poster', 'w342')

  return (
    <section
      className="hero-slider"
      aria-roledescription="carousel"
      aria-label="Featured titles"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="hero-slider-stage">
        {slides.map((s, i) => (
          <div
            key={s.id}
            className={`hero-slide${i === index ? ' is-active' : ''}`}
            aria-hidden={i !== index}
          >
            <div
              className="hero-slide-bg"
              style={{
                backgroundImage: `url(${buildImageUrl(config, s.backdrop_path, 'backdrop', 'original')})`,
              }}
            />
          </div>
        ))}
        <div className="hero-slide-overlay" />
      </div>

      <div className="hero-slider-inner">
        <div className="hero-copy">
          <div className="hero-poster">
            {poster ? <img src={poster} alt={title} /> : null}
          </div>
          <div className="hero-copy-body">
            <span className="hero-type">{kindLabel}</span>
            <h1 className="hero-title">{title}</h1>
            <div className="hero-meta">
              {year && <span className="hero-meta-item">{year}</span>}
              {rating && (
                <span className="hero-meta-item hero-meta-rating">
                  <Icon name="star" size={14} /> {rating}
                </span>
              )}
              {item.runtime && <span className="hero-meta-item">{formatRuntime(item.runtime)}</span>}
              {item.vote_count > 0 && (
                <span className="hero-meta-item">{compactNumber(item.vote_count)} votes</span>
              )}
            </div>
            {overview && <p className="hero-overview">{overview}</p>}
            <div className="hero-actions">
              <Link to={detailPath} className="btn btn--accent">
                <Icon name="play" size={15} />
                Watch now
              </Link>
              <Link to={detailPath} className="btn btn-ghost">
                <Icon name="info" size={15} />
                Details
              </Link>
            </div>
          </div>
        </div>

        <div className="hero-controls">
          <div className="hero-dots" role="tablist" aria-label="Slide selection">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Slide ${i + 1}: ${s.title || s.name}`}
                className={`hero-dot${i === index ? ' is-active' : ''}`}
                onClick={() => {
                  setIndex(i)
                  setProgress(0)
                }}
              >
                <span className="hero-dot-bar">
                  {i === index && (
                    <span
                      className="hero-dot-fill"
                      style={{ transform: `scaleX(${progress})` }}
                    />
                  )}
                </span>
              </button>
            ))}
          </div>
          {slides.length > 1 && (
            <div className="hero-arrows">
              <button
                type="button"
                className="hero-arrow"
                aria-label="Previous slide"
                onClick={() => {
                  setIndex((i) => (i - 1 + slides.length) % slides.length)
                  setProgress(0)
                }}
              >
                <Icon name="chevronLeft" size={16} />
              </button>
              <button
                type="button"
                className="hero-arrow"
                aria-label="Next slide"
                onClick={() => {
                  setIndex((i) => (i + 1) % slides.length)
                  setProgress(0)
                }}
              >
                <Icon name="chevronRight" size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
