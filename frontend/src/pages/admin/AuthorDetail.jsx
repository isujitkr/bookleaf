import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { adminGetAuthorById } from '../../services/api'
import { Spinner, Alert, fmtDate, fmtINR } from '../../components/Shared'

export default function AdminAuthorDetail() {
  const { id } = useParams()
  const [author, setAuthor] = useState(null)
  const [err, setErr]       = useState('')

  useEffect(() => {
    adminGetAuthorById(id)
      .then(r => setAuthor(r.data))
      .catch(e => setErr(e.message))
  }, [id])

  if (err) return <><Link to="/admin/authors" className="btn btn-outline btn-sm" style={{ marginBottom: 16 }}>← Back</Link><Alert type="error">{err}</Alert></>
  if (!author) return <Spinner />

  return (
    <div>
      <Link to="/admin/authors" className="btn btn-outline btn-sm" style={{ marginBottom: 16 }}>← Back to Authors</Link>

      <div className="card" style={{ maxWidth: 480, marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 600 }}>{author.name}</div>
        <div className="text-muted text-sm" style={{ marginTop: 2 }}>{author.author_id}</div>
        <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
          <div><span className="text-muted">Email:</span> {author.email}</div>
          <div><span className="text-muted">Phone:</span> {author.phone || '—'}</div>
          <div><span className="text-muted">City:</span> {author.city || '—'}</div>
          <div><span className="text-muted">Joined:</span> {fmtDate(author.joined_date)}</div>
        </div>
      </div>

      <div className="page-title" style={{ fontSize: 16, marginBottom: 12 }}>Books ({author.books?.length || 0})</div>

      {author.books?.length === 0 && <div className="text-muted">No books found.</div>}

      {author.books?.map(book => (
        <div className="card" key={book.book_id}>
          <div className="flex-between" style={{ marginBottom: 10 }}>
            <div>
              <div style={{ fontWeight: 600 }}>{book.title}</div>
              <div className="text-muted text-sm">{book.genre} · {book.isbn}</div>
            </div>
            <span className={`badge ${book.status === 'Published & Live' ? 'badge-resolved' : 'badge-inprogress'}`}>
              {book.status}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            <Stat label="MRP" value={fmtINR(book.mrp)} />
            <Stat label="Copies Sold" value={book.total_copies_sold} />
            <Stat label="Royalty Earned" value={fmtINR(book.total_royalty_earned)} />
            <Stat label="Royalty Pending" value={fmtINR(book.royalty_pending)} highlight={book.royalty_pending > 0} />
          </div>
          <div className="text-sm text-muted" style={{ marginTop: 8 }}>
            Available on: {book.available_on?.join(', ') || '—'}
          </div>
        </div>
      ))}
    </div>
  )
}

function Stat({ label, value, highlight }) {
  return (
    <div>
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.4px', color: '#6b6b67' }}>{label}</div>
      <div style={{ fontWeight: 600, marginTop: 2, color: highlight ? '#dc2626' : undefined }}>{value ?? '—'}</div>
    </div>
  )
}