import { useState } from 'react'

export default function StarRating({ value = 0, onChange, size = 'md', readonly = false, max = 5 }) {
  const [hover, setHover] = useState(0)
  const scale = max / 5

  const handleClick = (star, isHalf) => {
    if (readonly) return
    const newVal = (isHalf ? star - 0.5 : star) * scale
    onChange?.(newVal === value ? 0 : newVal)
  }

  const handleMouseMove = (e, star) => {
    if (readonly) return
    const rect = e.currentTarget.getBoundingClientRect()
    const isHalf = e.clientX - rect.left < rect.width / 2
    setHover(isHalf ? star - 0.5 : star)
  }

  const clamped = Math.min(Math.max(Number(value) || 0, 0), max)
  const display = hover || clamped / scale
  const stars = [1, 2, 3, 4, 5]

  return (
    <div className={`star-rating star-rating--${size}`}>
      {stars.map((star) => {
        const filled = display >= star
        const half = !filled && display >= star - 0.5
        return (
          <button
            key={star}
            type="button"
            className={`star-rating__star ${filled ? 'star-rating__star--filled' : ''} ${half ? 'star-rating__star--half' : ''}`}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect()
              const isHalf = e.clientX - rect.left < rect.width / 2
              handleClick(star, isHalf)
            }}
            onMouseMove={(e) => handleMouseMove(e, star)}
            onMouseLeave={() => !readonly && setHover(0)}
            disabled={readonly}
            aria-label={`${(star * scale).toFixed(1)} out of ${max}`}
          >
            <svg viewBox="0 0 24 24" width="100%" height="100%">
              {half && (
                <defs>
                  <linearGradient id={`half-${size}-${star}`}>
                    <stop offset="50%" stopColor="var(--accent)" />
                    <stop offset="50%" stopColor="var(--text-dim)" />
                  </linearGradient>
                </defs>
              )}
              <path
                d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                fill={half ? `url(#half-${size}-${star})` : filled ? 'var(--accent)' : 'var(--text-dim)'}
              />
            </svg>
          </button>
        )
      })}
    </div>
  )
}
