import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminGetAuthors } from '../../services/api'
import { Spinner, Alert, fmtDate, Pagination } from '../../components/Shared'

export default function AdminAuthors() {
  const [authors, setAuthors] = useState([])
  const [meta, setMeta]       = useState({ page: 1, pages: 1, total: 0 })
  const [search, setSearch]   = useState('')
  const [page, setPage]       = useState(1)
  const [loading, setLoading] = useState(true)
  const [err, setErr]         = useState('')

  useEffect(() => {
    setLoading(true)
    const params = { page, limit: 20 }
    if (search) params.search = search
    adminGetAuthors(params)
      .then(r => { setAuthors(r.data); setMeta(r.meta) })
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false))
  }, [page, search])

  if (err) return <Alert type="error">{err}</Alert>

  return (
    <div>
      <div className="page-title">
        Authors
        <div className="page-subtitle">{meta.total} registered authors</div>
      </div>

      <div className="filters-bar">
        <input
          type="text"
          placeholder="Search by name, email, or ID…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          style={{ minWidth: 260 }}
        />
      </div>

      {loading ? <Spinner /> : (
        <>
          <div className="card" style={{ padding: 0 }}>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Author ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>City</th>
                    <th>Joined</th>
                    <th>Books</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {authors.map(a => (
                    <tr key={a.author_id}>
                      <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{a.author_id}</td>
                      <td style={{ fontWeight: 500 }}>{a.name}</td>
                      <td className="text-muted text-sm">{a.email}</td>
                      <td className="text-muted text-sm">{a.city || '—'}</td>
                      <td className="text-muted text-sm">{fmtDate(a.joined_date)}</td>
                      <td>{a.books?.length ?? 0}</td>
                      <td>
                        <Link to={`/admin/authors/${a.author_id}`} className="btn btn-outline btn-sm">View</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <Pagination page={meta.page} pages={meta.pages} onChange={setPage} />
        </>
      )}
    </div>
  )
}