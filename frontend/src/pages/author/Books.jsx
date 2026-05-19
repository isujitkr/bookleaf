import { useEffect, useState } from 'react'
import { getMyBooks } from '../../services/api'
import { Spinner, Alert, fmtDate, fmtINR } from '../../components/Shared'

export default function AuthorBooks() {
  const [data, setData] = useState(null)
  const [err, setErr]   = useState('')

  useEffect(() => {
    getMyBooks()
      .then(r => setData(r.data))
      .catch(e => setErr(e.message))
  }, [])

  if (err) return <Alert type="error">{err}</Alert>
  if (!data) return <Spinner />

  return (
    <div>
      <div className="page-title">
        My Books
        <div className="page-subtitle">All books published under your account</div>
      </div>

      {data.books.length === 0 && (
        <div className="empty-state">
          <div style={{ fontSize: 32 }}>📚</div>
          <p>No books found on your account yet.</p>
        </div>
      )}

      {data.books.map(book => (
        <div className="card" key={book.book_id}>
          <div className="flex-between mb-0">
            <div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{book.title}</div>
              <div className="text-muted text-sm" style={{ marginTop: 2 }}>
                {book.genre} · ISBN: {book.isbn}
              </div>
            </div>
            <span className={`badge ${book.status === 'Published & Live' ? 'badge-resolved' : 'badge-inprogress'}`}>
              {book.status}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginTop: 16 }}>
            <Stat label="Publication Date" value={fmtDate(book.publication_date)} />
            <Stat label="MRP" value={fmtINR(book.mrp)} />
            <Stat label="Royalty / Copy" value={fmtINR(book.author_royalty_per_copy)} />
            <Stat label="Copies Sold" value={book.total_copies_sold?.toLocaleString('en-IN') ?? '—'} />
            <Stat label="Total Earned" value={fmtINR(book.total_royalty_earned)} />
            <Stat label="Royalty Paid" value={fmtINR(book.royalty_paid)} />
            <Stat
              label="Royalty Pending"
              value={fmtINR(book.royalty_pending)}
              highlight={book.royalty_pending > 0}
            />
            <Stat label="Last Payout" value={fmtDate(book.last_royalty_payout_date)} />
          </div>

          {book.available_on?.length > 0 && (
            <div className="text-sm text-muted mt-8">
              Available on: {book.available_on.join(', ')}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function Stat({ label, value, highlight }) {
  return (
    <div>
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.4px', color: '#6b6b67' }}>{label}</div>
      <div style={{ fontWeight: 600, marginTop: 2, color: highlight ? '#dc2626' : undefined }}>{value}</div>
    </div>
  )
}