export default function Pager({ page = 1, totalPages = 1, onPage }) {
  const canPrev = page > 1
  const canNext = page < totalPages

  return (
    <div className="pager">
      <button className="btn ghost" disabled={!canPrev} onClick={() => onPage(page - 1)}>
        Previous
      </button>
      <span>Page {page} of {totalPages}</span>
      <button className="btn ghost" disabled={!canNext} onClick={() => onPage(page + 1)}>
        Next
      </button>
    </div>
  )
}
