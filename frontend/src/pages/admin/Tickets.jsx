import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { adminGetTickets } from '../../services/api'
import { useSocket } from '../../hooks/useSocket'
import { Spinner, Alert, StatusBadge, PriorityBadge, fmtDateTime, Pagination } from '../../components/Shared'

const CATEGORIES = [
  'Royalty & Payments', 'ISBN & Metadata Issues', 'Printing & Quality',
  'Distribution & Availability', 'Book Status & Production Updates', 'General Inquiry',
]

export default function AdminTickets() {
  const [tickets, setTickets] = useState([])
  const [meta, setMeta]       = useState({ page: 1, pages: 1, total: 0 })
  const [filters, setFilters] = useState({ status: '', priority: '', category: '', search: '', page: 1 })
  const [loading, setLoading] = useState(true)
  const [err, setErr]         = useState('')

  const load = useCallback((f = filters) => {
    setLoading(true)
    const params = { page: f.page, limit: 20 }
    if (f.status)   params.status   = f.status
    if (f.priority) params.priority = f.priority
    if (f.category) params.category = f.category
    if (f.search)   params.search   = f.search
    adminGetTickets(params)
      .then(r => { setTickets(r.data); setMeta(r.meta) })
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false))
  }, [filters])

  useEffect(() => { load(filters) }, [filters])

  // Real-time: inject new tickets at top
  useSocket((socket) => {
    socket.on('ticket:new', () => {
      setFilters(f => ({ ...f, page: 1 })) // trigger reload
    })
  })

  const set = (k) => (e) => setFilters(f => ({ ...f, [k]: e.target.value, page: 1 }))

  if (err) return <Alert type="error">{err}</Alert>

  return (
    <div>
      <div className="page-title">
        Ticket Queue
        <div className="page-subtitle">{meta.total} tickets total — sorted by priority</div>
      </div>

      <div className="filters-bar">
        <input
          type="text"
          placeholder="Search subject, author, ID…"
          value={filters.search}
          onChange={set('search')}
          style={{ minWidth: 220 }}
        />
        <select value={filters.status} onChange={set('status')}>
          <option value="">All Statuses</option>
          <option>Open</option>
          <option>In Progress</option>
          <option>Resolved</option>
          <option>Closed</option>
        </select>
        <select value={filters.priority} onChange={set('priority')}>
          <option value="">All Priorities</option>
          <option>Critical</option>
          <option>High</option>
          <option>Medium</option>
          <option>Low</option>
        </select>
        <select value={filters.category} onChange={set('category')}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <button className="btn btn-outline btn-sm" onClick={() => setFilters({ status: '', priority: '', category: '', search: '', page: 1 })}>
          Clear
        </button>
      </div>

      {loading ? <Spinner /> : (
        <>
          {tickets.length === 0 ? (
            <div className="empty-state">
              <div style={{ fontSize: 32 }}>✅</div>
              <p>No tickets match these filters.</p>
            </div>
          ) : (
            <div className="card" style={{ padding: 0 }}>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Subject</th>
                      <th>Author</th>
                      <th>Category</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th>Assigned</th>
                      <th>Submitted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map(t => (
                      <tr key={t.ticket_id}>
                        <td>
                          <Link to={`/admin/tickets/${t.ticket_id}`} style={{ fontFamily: 'monospace', fontSize: 11 }}>
                            {t.ticket_id}
                          </Link>
                        </td>
                        <td style={{ maxWidth: 220 }}>
                          <Link to={`/admin/tickets/${t.ticket_id}`} style={{ fontWeight: 500 }}>
                            {t.subject}
                          </Link>
                          {t.book_title && <div className="text-muted text-sm">{t.book_title}</div>}
                        </td>
                        <td>
                          <div>{t.author_name}</div>
                          <div className="text-muted text-sm">{t.author_email}</div>
                        </td>
                        <td className="text-sm">{t.category}</td>
                        <td><PriorityBadge priority={t.priority} /></td>
                        <td><StatusBadge status={t.status} /></td>
                        <td className="text-muted text-sm">{t.assigned_to_name || '—'}</td>
                        <td className="text-muted text-sm">{fmtDateTime(t.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <Pagination
            page={meta.page}
            pages={meta.pages}
            onChange={p => setFilters(f => ({ ...f, page: p }))}
          />
        </>
      )}
    </div>
  )
}