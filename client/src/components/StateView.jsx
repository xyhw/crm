export function SkeletonList({ count = 5 }) {
  return (
    <div className="skeleton-list">
      {Array.from({ length: count }).map((_, i) => (
        <div className="skeleton-card" key={i}>
          <div className="skeleton-avatar" />
          <div className="skeleton-body">
            <div className="skeleton-bar skeleton-bar--70" />
            <div className="skeleton-bar skeleton-bar--40" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ title = '暂无数据', desc, action }) {
  return (
    <div className="state-empty">
      <div className="state-empty__title">{title}</div>
      {desc && <div className="state-empty__desc">{desc}</div>}
      {action}
    </div>
  );
}

export function LoadingTip({ text = '加载中...' }) {
  return <div className="empty-tip">{text}</div>;
}

export default function StateView({ loading, empty, skeleton, emptyTitle, emptyDesc, emptyAction, children }) {
  if (loading) return skeleton !== undefined ? skeleton : <LoadingTip />;
  if (empty) return <EmptyState title={emptyTitle} desc={emptyDesc} action={emptyAction} />;
  return children || null;
}
