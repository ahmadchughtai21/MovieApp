import { useRef } from 'react'
import Icon from './Icon'

export default function MediaRail({ children }) {
  const innerRef = useRef(null)

  function scroll(direction) {
    const el = innerRef.current
    if (!el) return
    const amount = el.clientWidth * 0.85
    el.scrollBy({ left: direction === 'next' ? amount : -amount, behavior: 'smooth' })
  }

  return (
    <div className="media-rail">
      <button
        type="button"
        className="rail-control rail-prev"
        aria-label="Scroll left"
        onClick={() => scroll('prev')}
      >
        <Icon name="chevronLeft" size={18} />
      </button>
      <div className="media-rail-inner" ref={innerRef}>
        {children}
      </div>
      <button
        type="button"
        className="rail-control rail-next"
        aria-label="Scroll right"
        onClick={() => scroll('next')}
      >
        <Icon name="chevronRight" size={18} />
      </button>
    </div>
  )
}
