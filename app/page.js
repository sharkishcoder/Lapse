'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-browser';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    async function routeBySession() {
      const { data, error } = await supabase.auth.getSession();

      if (error || !data.session) {
        router.replace('/login');
        return;
      }

      router.replace('/dashboard');
    }

    routeBySession();
  }, [router]);

  return (
    <main>
      <section className="card">
        <h1>Lapse</h1>
        <p className="muted">Checking your session...</p>
      </section>
    </main>
  );
}
