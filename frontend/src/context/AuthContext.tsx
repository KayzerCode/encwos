// src/context/AuthContext.tsx
import { createContext, useContext, useEffect, useState } from 'react'
import { apiLogin, apiLogout, apiMe, apiRegister } from '../services/api'

type User = { id: number; email: string } | null
type Ctx = {
  user: User
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<void>
  register: (email: string, password: string) => Promise<void>
}

const AuthCtx = createContext<Ctx | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(null)
  const [loading, setLoading] = useState(true)

  // lazy session restore
  const refresh = async () => {
    try {
      const me = await apiMe()
      if (me?.id) setUser({ id: me.id, email: me.email })
      else setUser(null)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])

  const login = async (email: string, password: string) => {
    const u = await apiLogin(email, password)
    setUser({ id: u.id, email: u.email })
  }

  const logout = async () => {
    await apiLogout()
    setUser(null)
  }

  const register = async (email: string, password: string) => {
    const u = await apiRegister(email, password);  // server sets HttpOnly cookie
    setUser({ id: u.id, email: u.email });         // reflect in client state
  };

  return (
    <AuthCtx.Provider value={{ user, loading, login, logout, refresh, register }}>
      {children}
    </AuthCtx.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthCtx)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
