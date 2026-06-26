import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, pageSize, total, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : page * pageSize + 1;
  const end = Math.min(total, (page + 1) * pageSize);
  const isFirstPage = page === 0;
  const isLastPage = page + 1 >= totalPages;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm opacity-70">
        {start.toLocaleString()}-{end.toLocaleString()} of {total.toLocaleString()}
      </p>
      <nav className="join" aria-label="Pagination">
        <button
          type="button"
          className="btn btn-sm join-item border-base-300 bg-base-100 disabled:border-base-300 disabled:bg-base-200/70 disabled:text-base-content/40"
          disabled={isFirstPage}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
          title="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div
          role="status"
          aria-live="polite"
          aria-label={`Page ${page + 1} of ${totalPages}`}
          className="join-item flex h-8 min-w-24 select-none items-center justify-center border border-base-300 bg-base-100 px-3 text-sm font-medium tabular-nums text-base-content shadow-sm"
        >
          {page + 1} / {totalPages}
        </div>
        <button
          type="button"
          className="btn btn-sm join-item border-base-300 bg-base-100 disabled:border-base-300 disabled:bg-base-200/70 disabled:text-base-content/40"
          disabled={isLastPage}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
          title="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </nav>
    </div>
  );
}
