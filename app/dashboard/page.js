'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-browser';

function summarizeStreaks(rows) {
  const latestByUser = new Map();

  for (const row of rows) {
    if (!latestByUser.has(row.user_id)) {
      latestByUser.set(row.user_id, row);
    }
  }

  return Array.from(latestByUser.values());
}

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sessionEmail, setSessionEmail] = useState('');
  const [entries, setEntries] = useState([]);
  const [streaks, setStreaks] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function load() {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        router.replace('/login');
        return;
      }

      setSessionEmail(session.user.email ?? '');

      const { data, error } = await supabase
        .from('daily_timelapses')
        .select('id,user_id,entry_date,video_url,streak_count,profiles(display_name)')
        .order('entry_date', { ascending: false })
        .limit(20);

      if (error) {
        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      const rows = data ?? [];
      setEntries(rows);
      setStreaks(summarizeStreaks(rows));
      setLoading(false);
    }

    load();
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  return (
    <main>
      <section className="card">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>Lapse Dashboard</h1>
            <p className="muted">Signed in as: {sessionEmail}</p>
          </div>
          <button type="button" onClick={handleLogout}>
            Log out
          </button>
        </div>

        {loading ? <p className="muted">Loading...</p> : null}
        {errorMessage ? <p>Error: {errorMessage}</p> : null}

        {!loading && !errorMessage ? (
          <>
            <h2 className="space-top">Current Streaks</h2>
            {streaks.length === 0 ? (
              <p className="muted">No streak rows yet. Add your first timelapse record.</p>
            ) : (
              <div className="list">
                {streaks.map((row) => (
                  <article key={row.id} className="item">
                    <strong>{row.profiles?.display_name ?? 'Unknown user'}</strong>
                    <p className="muted">Streak: {row.streak_count} day(s)</p>
                    <p className="muted">Last entry date: {row.entry_date}</p>
                  </article>
                ))}
              </div>
            )}

            <h2 className="space-top">Recent Timelapses</h2>
            {entries.length === 0 ? (
              <p className="muted">No timelapses uploaded yet.</p>
            ) : (
              <div className="list">
                {entries.map((row) => (
                  <article key={row.id} className="item">
                    <strong>{row.profiles?.display_name ?? 'Unknown user'}</strong>
                    <p className="muted">Date: {row.entry_date}</p>
                    <p>
                      Video URL:{' '}
                      <a href={row.video_url} target="_blank" rel="noreferrer">
                        {row.video_url}
                      </a>
                    </p>
                  </article>
                ))}
              </div>
            )}
          </>
        ) : null}
      </section>
    </main>
  );
}
