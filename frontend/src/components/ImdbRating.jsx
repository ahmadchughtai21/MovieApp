export default function ImdbRating({ value, size = 'sm' }) {
  if (value === null || value === undefined || value === '') return null
  const numeric = Number(value)
  if (Number.isNaN(numeric)) return null

  return (
    <span className={`imdb-rating imdb-rating--${size}`} title="IMDb rating">
      <span className="imdb-badge">IMDb</span>
      <span className="imdb-value">{numeric.toFixed(1)}</span>
    </span>
  )
}
