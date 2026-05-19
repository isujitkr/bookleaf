import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMyBooks, createTicket } from '../../services/api'
import { Alert } from '../../components/Shared'

export default function SubmitTicket() {
  const [books, setBooks]   = useState([])
  const [form, setForm]     = useState({ book_id: 'general', subject: '', description: '' })
  const [err, setErr]       = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    getMyBooks().then(r => setBooks(r.data.books)).catch(() => {})
  }, [])

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    if (!form.subject.trim() || !form.description.trim()) {
      setErr('Subject and description are required.')
      return
    }
    setErr('')
    setLoading(true)
    try {
      const res = await createTicket(form)
      setSuccess(`Ticket ${res.data.ticket_id} submitted successfully! Redirecting…`)
      setTimeout(() => navigate('/author/tickets'), 1800)
    } catch (ex) {
      setErr(ex.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="page-title">
        Submit Support Query
        <div className="page-subtitle">Raise a ticket with the BookLeaf support team</div>
      </div>

      <div className="card" style={{ maxWidth: 640 }}>
        {err && <Alert type="error">{err}</Alert>}
        {success && <Alert type="success">{success}</Alert>}

        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">
              Related Book <span style={{ color: '#6b6b67', fontWeight: 400 }}>(optional)</span>
            </label>
            <select value={form.book_id} onChange={set('book_id')}>
              <option value="general">General / Account Level</option>
              {books.map(b => (
                <option key={b.book_id} value={b.book_id}>{b.title}</option>
              ))}
            </select>
            <div className="form-hint">Select the book this query relates to, or leave as General.</div>
          </div>

          <div className="form-group">
            <label className="form-label">Subject <span className="req">*</span></label>
            <input
              type="text"
              value={form.subject}
              onChange={set('subject')}
              placeholder="e.g. Royalty payment not received for October"
              maxLength={120}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description <span className="req">*</span></label>
            <textarea
              value={form.description}
              onChange={set('description')}
              placeholder="Please describe your issue in detail…"
              rows={6}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Attachment <span style={{ color: '#6b6b67', fontWeight: 400 }}>(optional)</span>
            </label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              disabled
              style={{ cursor: 'not-allowed', opacity: .5 }}
            />
            <div className="form-hint">File upload coming soon. You can paste image links in the description for now.</div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" type="submit" disabled={loading || !!success}>
              {loading ? 'Submitting…' : 'Submit Ticket'}
            </button>
            <button type="button" className="btn btn-outline" onClick={() => navigate('/author/tickets')}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}