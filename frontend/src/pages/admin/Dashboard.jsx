import { useEffect, useState } from 'react'
import { adminGetStats } from '../../services/api'
import { useSocket } from '../../hooks/useSocket'
import { Spinner, Alert } from '../../components/Shared'

const PRIORITIES = ['Critical', 'High', 'Medium', 'Low']
const STATUSES   = ['Open', 'In Progress', 'Resolved', 'Closed']

export default function AdminDashboard() {
  const [stats, setStats]     = useState(null)
  const [toasts, setToasts]   = useState([])
  const [err, setErr]         = useState('')

  const load = () =>
    adminGetStats()
      .then(r => setStats(r.data))
      .catch(e => setErr(e.message))

  useEffect(() => { load() }, [])

  // Real-time: new ticket toast
  useSocket((socket) => {
    socket.on('ticket:new', (data) => {
      setToasts(prev => [data, ...prev].slice(0, 5))
      load() // refresh stats
      setTimeout(() => setToasts(prev => prev.filter(t => t !== data)), 6000)
    })
  })

  if (err) return <Alert type="error">{err}</Alert>
  if (!stats) return <Spinner />

  const total = stats.total || 0

  return (
    <div>
      {toasts.map((t, i) => (
        <div key={i} className="alert alert-info" style={{ marginBottom: 8 }}>
          🔔 New ticket from <strong>{t.author_name}</strong>: &ldquo;{t.subject}&rdquo; —{' '}
          <strong>{t.priority}</strong>
          {t.ai_error && (
            <span style={{ marginLeft: 8, fontSize: 11, color: '#92400e', background: '#fef3c7', padding: '1px 6px', borderRadius: 4 }}>
              AI unavailable — review classification
            </span>
          )}
        </div>
      ))}

      <div className="page-title">
        Dashboard
        <div className="page-subtitle">Overview of all support tickets</div>
      </div>

      {/* Top stats */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Total Tickets</div>
          <div className="stat-value">{total}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Open</div>
          <div className="stat-value" style={{ color: '#1d4ed8' }}>{stats.by_status?.Open || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">In Progress</div>
          <div className="stat-value" style={{ color: '#92400e' }}>{stats.by_status?.['In Progress'] || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Resolved</div>
          <div className="stat-value" style={{ color: '#15803d' }}>{stats.by_status?.Resolved || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Closed</div>
          <div className="stat-value" style={{ color: '#15803d' }}>{stats.by_status?.['Closed'] || 0}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* By Priority */}
        <div className="card">
          <div className="card-title">By Priority</div>
          {PRIORITIES.map(p => {
            const count = stats.by_priority?.[p] || 0
            const pct   = total ? Math.round((count / total) * 100) : 0
            return (
              <div key={p} style={{ marginBottom: 10 }}>
                <div className="flex-between text-sm" style={{ marginBottom: 3 }}>
                  <span>{p}</span>
                  <span className="text-muted">{count}</span>
                </div>
                <div style={{ background: '#f3f4f6', borderRadius: 4, height: 6 }}>
                  <div style={{
                    height: 6, borderRadius: 4, width: `${pct}%`,
                    background: { Critical: '#dc2626', High: '#f97316', Medium: '#eab308', Low: '#22c55e' }[p]
                  }} />
                </div>
              </div>
            )
          })}
        </div>

        {/* By Category */}
        <div className="card">
          <div className="card-title">By Category</div>
          {Object.entries(stats.by_category || {}).map(([cat, count]) => (
            <div key={cat} className="flex-between" style={{ marginBottom: 8, fontSize: 13 }}>
              <span>{cat}</span>
              <span className="badge badge-closed">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}