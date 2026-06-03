export function HeroSkeleton() {
  return <div className="skeleton skeleton-hero" aria-hidden="true" />
}

export function CardSkeleton({ count = 6 }) {
  return (
    <div className="media-rail-inner" style={{ paddingLeft: 0 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="media-card" style={{ pointerEvents: 'none' }}>
          <div className="skeleton skeleton-card" />
          <div className="skeleton skeleton-line short" style={{ marginTop: 12 }} />
          <div className="skeleton skeleton-line" style={{ width: '50%' }} />
        </div>
      ))}
    </div>
  )
}

export function GridSkeleton({ count = 12 }) {
  return (
    <div className="grid">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="media-card" style={{ pointerEvents: 'none' }}>
          <div className="skeleton skeleton-card" />
          <div className="skeleton skeleton-line short" style={{ marginTop: 12 }} />
          <div className="skeleton skeleton-line" style={{ width: '50%' }} />
        </div>
      ))}
    </div>
  )
}

export function TextSkeleton({ lines = 3 }) {
  return (
    <div className="state">
      <div className="skeleton skeleton-line medium" />
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skeleton skeleton-line long" />
      ))}
    </div>
  )
}

export default function Loading({ label }) {
  return (
    <div className="state" role="status" aria-live="polite">
      {label ? <span className="state-title">{label}</span> : <span className="state-title">Loading…</span>}
      <div className="skeleton skeleton-line medium" style={{ marginTop: 12 }} />
    </div>
  )
}
