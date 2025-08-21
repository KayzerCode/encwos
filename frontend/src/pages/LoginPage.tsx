// src/pages/LoginPage.tsx
import type { FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from  '../context/AuthContext'

export default function LoginPage() {
  const nav = useNavigate()
  const { login, logout } = useAuth()
  const location = useLocation() as unknown as { state?: { from?: string } }
  const from = location?.state?.from ?? '/app'

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const email = String(fd.get('email') || '')
    const password = String(fd.get('password') || '')
    try {
      await login(email, password)
      nav(from, { replace: true })
    } catch {
      alert('Invalid email or password')
    }
  }

  const onLogout = async () => {
    await logout()
    nav('/', { replace: true })
  }

  return (
    <div>
      <h2>Login</h2>
      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 360 }}>
        <input name="email" placeholder="email" />
        <input name="password" type="password" placeholder="password" />
        <button type="submit">Sign in</button>
      </form>
      <div style={{ marginTop: 16 }}>
        <button onClick={onLogout}>Sign out</button>
      </div>
      <div>
        <button onClick={() => nav('/register')}>Create an account</button>
      </div>

    </div>
  )
}
