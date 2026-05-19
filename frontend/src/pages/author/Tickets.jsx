import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMyTickets } from '../../services/api'
import { useSocket } from '../../hooks/useSocket'
import { Spinner, Alert, StatusBadge, PriorityBadge, fmtDateTime, Pagination } from '../../components/Shared'

export default function AuthorTickets() {
  const [tickets, setTickets] = useState([])
  const [meta, setMeta]       = useState({ page: 1, pages: 1 })
  const [filter, setFilter]   = useState({ status: '', page: 1 })
  const [loading, setLoading] = useState(true)
  const [err, setErr]         = useState('')

  const load = (f = filter) => {
    setLoading(true)
    const params = { page: f.page, limit: 15 }
    if (f.status) params.status = f.status
    getMyTickets(params)
      .then(r => { setTickets(r.data); setMeta(r.meta) })
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [filter])

  // Real-time: update status or inject new response indicator
  useSocket((socket) => {
    socket.on('ticket:statusUpdate', ({ ticket_id, status }) => {
      setTickets(prev => prev.map(t => t.ticket_id === ticket_id ? { ...t, status } : t))
    })
    socket.on('ticket:newResponse', ({ ticket_id, status }) => {
      setTickets(prev => prev.map(t => t.ticket_id === ticket_id ? { ...t, status, _hasNewReply: true } : t))
    })
  })

  const setStatus = (v) => setFilter({ status: v, page: 1 })

  if (err) return <Alert type="error">{err}</Alert>

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: 20 }}>
        <div className="page-title" style={{ marginBottom: 0 }}>My Tickets</div>
        <Link className="btn btn-primary btn-sm" to="/author/tickets/new">+ New Ticket</Link>
      </div>

      <div className="filters-bar">
        <select value={filter.status} onChange={e => setStatus(e.target.value)}>
          <option value="">All Statuses</option>
          <option>Open</option>
          <option>In Progress</option>
          <option>Resolved</option>
          <option>Closed</option>
        </select>
      </div>

      {loading ? <Spinner /> : (
        <>
          {tickets.length === 0 ? (
            <div className="empty-state">
              <div style={{ fontSize: 32 }}>🎫</div>
              <p>No tickets found.</p>
            </div>
          ) : (
            <div className="card" style={{ padding: 0 }}>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Ticket ID</th>
                      <th>Subject</th>
                      <th>Book</th>
                      <th>Status</th>
                      <th>Priority</th>
                      <th>Submitted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map(t => (
                      <tr key={t.ticket_id}>
                        <td>
                          <Link to={`/author/tickets/${t.ticket_id}`} style={{ fontFamily: 'monospace', fontSize: 12 }}>
                            {t.ticket_id}
                          </Link>
                          {t._hasNewReply && (
                            <span className="badge badge-open" style={{ marginLeft: 6, fontSize: 10 }}>New reply</span>
                          )}
                        </td>
                        <td>
                          <Link to={`/author/tickets/${t.ticket_id}`}>{t.subject}</Link>
                        </td>
                        <td className="text-muted text-sm">{t.book_title || 'General'}</td>
                        <td><StatusBadge status={t.status} /></td>
                        <td><PriorityBadge priority={t.priority} /></td>
                        <td className="text-muted text-sm">{fmtDateTime(t.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <Pagination page={meta.page} pages={meta.pages} onChange={p => setFilter(f => ({ ...f, page: p }))} />
        </>
      )}
    </div>
  )
}