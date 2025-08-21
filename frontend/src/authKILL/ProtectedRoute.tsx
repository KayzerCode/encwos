// /src/ProtectedRoutes.tsx
import { Navigate, useLocation } from 'react-router-dom'

/**
 * Very simple auth gate. For now we only check a localStorage flag.
 * Later we will replace this with real auth (Workers + D1).
 */
export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthed = typeof window !== 'undefined' && localStorage.getItem('encwos_token')
  const location = useLocation()

  if (!isAuthed) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return <>{children}</>
}
