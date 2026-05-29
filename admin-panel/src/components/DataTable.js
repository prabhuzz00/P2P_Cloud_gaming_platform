import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react';
import { useMemo, useState } from 'react';

function compareValues(left, right) {
  const leftValue = left ?? '';
  const rightValue = right ?? '';

  if (typeof leftValue === 'number' && typeof rightValue === 'number') {
    return leftValue - rightValue;
  }

  return String(leftValue).localeCompare(String(rightValue), undefined, { numeric: true, sensitivity: 'base' });
}

function DataTable({
  columns,
  data,
  onPageChange,
  currentPage,
  totalPages,
  loading,
  keyField = 'id',
  emptyMessage = 'No records available.',
  pageSize = 8,
}) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const sortedData = useMemo(() => {
    if (!sortConfig.key) {
      return data;
    }

    const sorted = [...data].sort((firstRow, secondRow) => {
      const left = typeof sortConfig.key === 'function' ? sortConfig.key(firstRow) : firstRow[sortConfig.key];
      const right = typeof sortConfig.key === 'function' ? sortConfig.key(secondRow) : secondRow[sortConfig.key];
      const result = compareValues(left, right);
      return sortConfig.direction === 'asc' ? result : -result;
    });

    return sorted;
  }, [data, sortConfig]);

  const derivedTotalPages = totalPages || Math.max(1, Math.ceil(sortedData.length / pageSize));
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [currentPage, pageSize, sortedData]);

  const toggleSort = (column) => {
    if (!column.sortable) {
      return;
    }

    setSortConfig((current) => ({
      key: column.sortKey || column.key,
      direction: current.key === (column.sortKey || column.key) && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 shadow-glow">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-800 text-sm text-slate-300">
          <thead className="bg-slate-950/60 text-xs uppercase tracking-[0.2em] text-slate-400">
            <tr>
              {columns.map((column) => {
                const isActive = sortConfig.key === (column.sortKey || column.key);
                return (
                  <th key={column.key} className="px-5 py-4 text-left font-medium">
                    <button
                      type="button"
                      onClick={() => toggleSort(column)}
                      className={`inline-flex items-center gap-2 ${column.sortable ? 'hover:text-white' : 'cursor-default'}`}
                    >
                      <span>{column.label}</span>
                      {column.sortable ? (
                        isActive && sortConfig.direction === 'desc' ? <ChevronDown size={14} /> : <ChevronUp size={14} />
                      ) : null}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {loading
              ? Array.from({ length: 5 }).map((_, index) => (
                  <tr key={`skeleton-${index}`}>
                    {columns.map((column) => (
                      <td key={`${column.key}-${index}`} className="px-5 py-4">
                        <div className="h-4 animate-pulse rounded bg-slate-800" />
                      </td>
                    ))}
                  </tr>
                ))
              : null}
            {!loading && paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-5 py-10 text-center text-slate-400">
                  {emptyMessage}
                </td>
              </tr>
            ) : null}
            {!loading
              ? paginatedData.map((row, rowIndex) => (
                  <tr key={row[keyField] || row.id || rowIndex} className="transition hover:bg-slate-800/30">
                    {columns.map((column) => (
                      <td key={`${column.key}-${row[keyField] || rowIndex}`} className="px-5 py-4 align-top">
                        {column.render ? column.render(row) : row[column.key] ?? '--'}
                      </td>
                    ))}
                  </tr>
                ))
              : null}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950/40 px-5 py-4 text-sm text-slate-400">
        <p>
          Page {currentPage} of {derivedTotalPages}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            className="rounded-lg border border-slate-800 p-2 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => onPageChange(Math.min(derivedTotalPages, currentPage + 1))}
            disabled={currentPage >= derivedTotalPages}
            className="rounded-lg border border-slate-800 p-2 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default DataTable;
