// App.tsx
import { Route, Routes, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import '@fortawesome/fontawesome-free/css/all.min.css';
import AppLayout from './components/AppLayout';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import WorkspacePage from './pages/WorkspacePage';

import ParserPage from './pages/parser/ParserPage';
import ProxySection from './pages/parser/ProxySection';
import StatsSection from './pages/parser/StatsSection';
import TasksSection from './pages/parser/TasksSection';

import ContentPage from './pages/content/ContentPage';
import SeedsSection from './pages/content/SeedsSection';
import GroupsSection from './pages/content/GroupSection';


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
        {/* Protected: Parser with nested sections */}
        <Route
          path="/parser"
          element={
            <ProtectedRoute>
              <ParserPage />
            </ProtectedRoute>
          }
        >
          {/* Default sub-route -> /parser */}
          <Route index element={<StatsSection />} />
          {/* Explicit sub-routes */}
          <Route path="proxy" element={<ProxySection />} />
          <Route path="stats" element={<StatsSection />} />
          <Route path="tasks" element={<TasksSection />} />
        </Route>

        {/* Protected: Content with nested sections */}
        <Route
          path="/content"
          element={
            <ProtectedRoute>
              <ContentPage />
            </ProtectedRoute>
          }
        >
          {/* Default sub-route -> /content */}
          <Route index element={<SeedsSection />} />
          {/* Explicit sub-routes */}
          <Route path="seeds" element={<SeedsSection />} />
          <Route path="groups" element={<GroupsSection />} />
        </Route>
        <Route path="*" element={<h2>Not found</h2>} />
      </Routes>
    </AppLayout>
  );
}
