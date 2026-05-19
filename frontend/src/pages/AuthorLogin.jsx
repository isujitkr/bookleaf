import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authorLogin } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { Alert } from '../components/Shared'

export default function AuthorLoginPage() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [err, setErr]   = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate  = useNavigate()

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    setLoading(true)
    try {
      const res = await authorLogin(form)
      login(res.data.token, res.data.author, 'author')
      navigate('/author/books')
    } catch (ex) {
      setErr(ex)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-box">
        <div className="auth-logo">Book<span>Leaf</span></div>
        <div className="auth-title">Author Sign In</div>
        <div className="auth-sub">Log in to your author account</div>

        {err && <Alert type="error">{err}</Alert>}

        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input type="email" value={form.email} onChange={set('email')} required placeholder="you@gmail.com" />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input type="password" value={form.password} onChange={set('password')} required placeholder="••••••••" />
          </div>
          <button className="btn btn-primary w-full" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <div className="auth-switch">
          Admin? <Link to="/admin/login">Admin login →</Link>
        </div>
      </div>
    </div>
  )
}