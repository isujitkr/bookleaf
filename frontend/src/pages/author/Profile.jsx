import { useEffect, useState } from 'react'
import { getProfile, updateProfile } from '../../services/api'
import { Spinner, Alert, fmtDate } from '../../components/Shared'

export default function AuthorProfile() {
  const [profile, setProfile] = useState(null)
  const [form, setForm]       = useState({ phone: '', city: '' })
  const [err, setErr]         = useState('')
  const [msg, setMsg]         = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getProfile()
      .then(r => {
        setProfile(r.data)
        setForm({ phone: r.data.phone || '', city: r.data.city || '' })
      })
      .catch(e => setErr(e.message))
  }, [])

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const save = async (e) => {
    e.preventDefault()
    setErr(''); setMsg('')
    setLoading(true)
    try {
      await updateProfile(form)
      setMsg('Profile updated successfully.')
    } catch (ex) {
      setErr(ex.message)
    } finally {
      setLoading(false)
    }
  }

  if (!profile && !err) return <Spinner />

  return (
    <div>
      <div className="page-title">Profile</div>

      {err && <Alert type="error">{err}</Alert>}

      <div className="card" style={{ maxWidth: 480 }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 18, fontWeight: 600 }}>{profile?.name}</div>
          <div className="text-muted text-sm">{profile?.author_id} · Joined {fmtDate(profile?.joined_date)}</div>
        </div>

        <div className="form-group">
          <label className="form-label">Email</label>
          <input type="email" value={profile?.email || ''} disabled style={{ opacity: .6, cursor: 'not-allowed' }} />
          <div className="form-hint">Email cannot be changed. Contact support if needed.</div>
        </div>

        {msg && <Alert type="success">{msg}</Alert>}

        <form onSubmit={save}>
          <div className="form-group">
            <label className="form-label">Phone</label>
            <input type="text" value={form.phone} onChange={set('phone')} placeholder="+91-00000-00000" />
          </div>
          <div className="form-group">
            <label className="form-label">City</label>
            <input type="text" value={form.city} onChange={set('city')} placeholder="City" />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? 'Saving…' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  )
}