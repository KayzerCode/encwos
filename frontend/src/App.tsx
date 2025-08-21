// App.tsx
import { Route, Routes, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import '@fortawesome/fontawesome-free/css/all.min.css';
import AppLayout from './components/AppLayout';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import WorkspacePage from './pages/WorkspacePage';
// import ProtectedRoute from './auth/ProtectedRoute';
import ProtectedRoute from './components/ProtectedRoute'
import RegisterPage from './pages/RegisterPage';
export default function App() {
  const nav = useNavigate();
  useEffect(() => {
    // put legacy redirects here if needed
  }, [nav]);

  return (
    <AppLayout>
      {/* IMPORTANT: Only page content here. No extra header/footer. */}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <WorkspacePage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<h2>Not found</h2>} />
      </Routes>
    </AppLayout>
  );
}
