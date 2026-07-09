'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-browser';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function handleLogin(event) {
    event.preventDefault();
    setLoading(true);
    setErrorMessage('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    router.replace('/dashboard');
  }

  return (
    <main>
      <section className="card">
        <h1>Log in to Lapse</h1>
        <p className="muted">
          Sign in with one of the two pre-created accounts in your Supabase project.
        </p>

        <form onSubmit={handleLogin} className="space-top">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="********"
          />

          <button type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        {errorMessage ? <p className="space-top">Error: {errorMessage}</p> : null}
      </section>
    </main>
  );
}
