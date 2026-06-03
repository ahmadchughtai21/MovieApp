import Icon from './Icon'

export default function Pager({ page = 1, totalPages = 1, onPage }) {
  const canPrev = page > 1
  const canNext = page < totalPages

  return (
    <nav className="pager" aria-label="Pagination">
      <button
        className="btn btn-ghost"
        disabled={!canPrev}
        onClick={() => onPage(page - 1)}
        aria-label="Previous page"
      >
        <Icon name="arrowLeft" size={14} />
        Prev
      </button>
      <span className="pager-info">{page} / {totalPages}</span>
      <button
        className="btn btn-ghost"
        disabled={!canNext}
        onClick={() => onPage(page + 1)}
        aria-label="Next page"
      >
        Next
        <Icon name="arrowRight" size={14} />
      </button>
    </nav>
  )
}
