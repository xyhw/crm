export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  return (
    <div className="mi-pagination">
      <button
        type="button"
        className="mi-page-btn"
        disabled={page <= 1}
        onClick={() => onChange(Math.max(1, page - 1))}
      >
        上一页
      </button>
      <span className="mi-page-info">{page}/{totalPages}</span>
      <button
        type="button"
        className="mi-page-btn"
        disabled={page >= totalPages}
        onClick={() => onChange(Math.min(totalPages, page + 1))}
      >
        下一页
      </button>
    </div>
  );
}