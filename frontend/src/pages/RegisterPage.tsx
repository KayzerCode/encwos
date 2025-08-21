// src/pages/RegisterPage.tsx
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';

export default function RegisterPage() {
  const { register } = useAuth();  // <- use context to register user
  const nav = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErr(null);
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get('email') || '').trim();
    const password = String(fd.get('password') || '');
    try {
      await register(email, password);  // sets cookie + updates context
      nav('/app', { replace: true });
    } catch (e: any) {
      setErr(e?.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h2>Create account</h2>
      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 360 }}>
        <input name="email" type="email" placeholder="email" required />
        <input name="password" type="password" placeholder="password (min 6)" minLength={6} required />
        <button type="submit" disabled={submitting}>{submitting ? 'Creating…' : 'Create account'}</button>
      </form>
      {err && <p style={{ color: 'tomato' }}>{err}</p>}
      <p style={{ marginTop: 12, opacity: 0.8 }}>
        Already have an account? <a href="/login">Sign in</a>
      </p>
    </div>
  );
}
