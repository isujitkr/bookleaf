export function StatusBadge({ status }) {
  const cls = {
    'Open':        'badge badge-open',
    'In Progress': 'badge badge-inprogress',
    'Resolved':    'badge badge-resolved',
    'Closed':      'badge badge-closed',
  }[status] || 'badge'
  return <span className={cls}>{status}</span>
}

export function PriorityBadge({ priority }) {
  const cls = {
    'Critical': 'badge badge-critical',
    'High':     'badge badge-high',
    'Medium':   'badge badge-medium',
    'Low':      'badge badge-low',
  }[priority] || 'badge'
  return <span className={cls}>{priority}</span>
}

export function Spinner() {
  return <div className="spinner" />
}

export function Alert({ type = 'error', children }) {
  return <div className={`alert alert-${type}`}>{children}</div>
}

export function Pagination({ page, pages, onChange }) {
  if (pages <= 1) return null
  return (
    <div className="pagination">
      <button disabled={page === 1} onClick={() => onChange(page - 1)}>‹</button>
      {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
        <button key={p} className={p === page ? 'active' : ''} onClick={() => onChange(p)}>{p}</button>
      ))}
      <button disabled={page === pages} onClick={() => onChange(page + 1)}>›</button>
    </div>
  )
}

export function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function fmtDateTime(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function fmtINR(n) {
  if (n == null) return '—'
  return '₹' + Number(n).toLocaleString('en-IN')
}