"use client";

interface Props {
  page: number;          // 0-based
  totalPages: number;
  totalElements: number;
  size: number;
  onPageChange: (page: number) => void;
}

export default function Paginator({ page, totalPages, totalElements, size, onPageChange }: Props) {
  if (totalPages <= 1) return null;
  const from = page * size + 1;
  const to   = Math.min((page + 1) * size, totalElements);
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderTop: "1px solid var(--border,#e5e7eb)", fontSize: "0.85rem", color: "var(--text-muted,#6b7280)" }}>
      <span>{from}–{to} of {totalElements}</span>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={page === 0}
          onClick={() => onPageChange(page - 1)}
        >
          ← Prev
        </button>
        <span style={{ padding: "4px 8px" }}>
          {page + 1} / {totalPages}
        </span>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={page >= totalPages - 1}
          onClick={() => onPageChange(page + 1)}
        >
          Next →
        </button>
      </div>
    </div>
  );
}
