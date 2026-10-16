interface PaginationProps {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
}

export function Pagination({ page, pageSize, total, onPageChange }: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const buttonClass = 'rounded border px-3 py-1 disabled:cursor-not-allowed disabled:opacity-40'
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between text-sm text-gray-600">
      <span>{total.toLocaleString('en-US')} employees</span>
      <div className="flex items-center gap-3">
        <button type="button" className={buttonClass} disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Previous
        </button>
        <span>
          Page {page} of {pageCount}
        </span>
        <button type="button" className={buttonClass} disabled={page >= pageCount} onClick={() => onPageChange(page + 1)}>
          Next
        </button>
      </div>
    </nav>
  )
}
