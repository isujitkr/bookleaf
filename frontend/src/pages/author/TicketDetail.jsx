import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getMyTicketById } from '../../services/api'
import { useSocket } from '../../hooks/useSocket'
import { Spinner, Alert, StatusBadge, PriorityBadge, fmtDateTime } from '../../components/Shared'

export default function AuthorTicketDetail() {
  const { id } = useParams()
  const [ticket, setTicket] = useState(null)
  const [err, setErr]       = useState('')

  const load = () =>
    getMyTicketById(id)
      .then(r => setTicket(r.data))
      .catch(e => setErr(e.message))

  useEffect(() => { load() }, [id])

  // Real-time updates
  useSocket((socket) => {
    socket.on('ticket:statusUpdate', ({ ticket_id, status }) => {
      if (ticket_id === id) setTicket(prev => prev ? { ...prev, status } : prev)
    })
    socket.on('ticket:newResponse', ({ ticket_id, response, status }) => {
      if (ticket_id === id) {
        setTicket(prev => prev
          ? { ...prev, status, responses: [...prev.responses, response] }
          : prev
        )
      }
    })
  })

  if (err) return <><Link to="/author/tickets" className="btn btn-outline btn-sm" style={{ marginBottom: 16 }}>← Back</Link><Alert type="error">{err}</Alert></>
  if (!ticket) return <Spinner />

  const publicReplies = ticket.responses.filter(r => !r.is_internal_note)

  return (
    <div>
      <Link to="/author/tickets" className="btn btn-outline btn-sm" style={{ marginBottom: 16 }}>← Back to Tickets</Link>

      <div className="card">
        <div className="ticket-header">
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#6b6b67', marginBottom: 4 }}>{ticket.ticket_id}</div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>{ticket.subject}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
          </div>
        </div>

        <div className="ticket-meta-row">
          <span><strong>Book:</strong> {ticket.book_title || 'General / Account'}</span>
          <span><strong>Category:</strong> {ticket.category}</span>
          <span><strong>Submitted:</strong> {fmtDateTime(ticket.createdAt)}</span>
          {ticket.assigned_to_name && <span><strong>Assigned to:</strong> {ticket.assigned_to_name}</span>}
        </div>

        <div style={{ background: '#f9fafb', border: '1px solid #e2e2de', borderRadius: 6, padding: '12px 14px', fontSize: 13, lineHeight: 1.7 }}>
          {ticket.description}
        </div>

        {/* Thread */}
        {publicReplies.length > 0 && (
          <div className="thread">
            {publicReplies.map((r, i) => (
              <div key={i}>
                <div className={`message-bubble ${r.sent_by === 'author' ? 'from-author' : 'from-admin'}`}>
                  <div className="message-meta">
                    {r.sender_name} · {fmtDateTime(r.createdAt)}
                  </div>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{r.message}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {publicReplies.length === 0 && (
          <div className="text-muted text-sm mt-16" style={{ textAlign: 'center', padding: '16px 0' }}>
            No responses yet. Our team will get back to you within 24–48 business hours.
          </div>
        )}
      </div>
    </div>
  )
}