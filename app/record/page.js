'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-browser';

const CANDIDATE_TYPES = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
  'video/mp4',
];

function pickMimeType() {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
    return '';
  }

  for (const type of CANDIDATE_TYPES) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }

  return '';
}

function getFileExtension(mimeType) {
  if (mimeType.includes('mp4')) {
    return 'mp4';
  }

  return 'webm';
}

function getTodayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function getPreviousDateString(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() - 1);
  return date.toISOString().slice(0, 10);
}

function calculateStreakIncludingToday(dateStrings, todayDate) {
  const availableDates = new Set(dateStrings);
  let streak = 1;
  let pointer = getPreviousDateString(todayDate);

  while (availableDates.has(pointer)) {
    streak += 1;
    pointer = getPreviousDateString(pointer);
  }

  return streak;
}

export default function RecordPage() {
  const router = useRouter();
  const liveVideoRef = useRef(null);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const recordedBlobRef = useRef(null);
  const recordedMimeTypeRef = useRef('');

  const [loading, setLoading] = useState(true);
  const [startingCamera, setStartingCamera] = useState(false);
  const [recording, setRecording] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    async function protectRoute() {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error || !session) {
        router.replace('/login');
        return;
      }

      setLoading(false);
    }

    protectRoute();

    return () => {
      stopCamera();
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
    // previewUrl is intentionally excluded because we only want cleanup on unmount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => {
    if (!recording) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setDurationSeconds((prev) => prev + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [recording]);

  async function startCamera() {
    setStartingCamera(true);
    setErrorMessage('');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: true,
      });

      streamRef.current = stream;

      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream;
      }
    } catch (error) {
      setErrorMessage(error.message || 'Could not start camera. Please check permissions.');
    } finally {
      setStartingCamera(false);
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (liveVideoRef.current) {
      liveVideoRef.current.srcObject = null;
    }
  }

  function startRecording() {
    if (!streamRef.current) {
      setErrorMessage('Start camera first.');
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl('');
    }

    const mimeType = pickMimeType();
    chunksRef.current = [];

    try {
      const recorder = mimeType
        ? new MediaRecorder(streamRef.current, { mimeType })
        : new MediaRecorder(streamRef.current);

      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blobType = mimeType || 'video/webm';
        const blob = new Blob(chunksRef.current, { type: blobType });
        recordedBlobRef.current = blob;
        recordedMimeTypeRef.current = blobType;
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        setSuccessMessage('');
      };

      recorder.start(1000);
      setDurationSeconds(0);
      setRecording(true);
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error.message || 'Could not start recording.');
    }
  }

  function stopRecording() {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }

    setRecording(false);
  }

  function resetRecording() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl('');
    }

    chunksRef.current = [];
    recordedBlobRef.current = null;
    recordedMimeTypeRef.current = '';
    setDurationSeconds(0);
    setSuccessMessage('');
  }

  function getBlobDurationSeconds(blobUrl) {
    return new Promise((resolve) => {
      const tempVideo = document.createElement('video');
      tempVideo.preload = 'metadata';

      const handleLoadedMetadata = () => {
        if (Number.isFinite(tempVideo.duration) && tempVideo.duration > 0) {
          resolve(Math.round(tempVideo.duration));
        } else {
          resolve(null);
        }
      };

      const handleError = () => resolve(null);

      tempVideo.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true });
      tempVideo.addEventListener('error', handleError, { once: true });
      tempVideo.src = blobUrl;
    });
  }

  async function saveTodayEntry() {
    setErrorMessage('');
    setSuccessMessage('');

    if (!previewUrl || !recordedBlobRef.current) {
      setErrorMessage('Record a clip first, then save it.');
      return;
    }

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      router.replace('/login');
      return;
    }

    setUploading(true);

    try {
      const userId = session.user.id;
      const todayDate = getTodayDateString();
      const mimeType = recordedMimeTypeRef.current || pickMimeType() || 'video/webm';
      const fileExtension = getFileExtension(mimeType);
      const timestamp = Date.now();
      const filePath = `${userId}/${todayDate}-${timestamp}.${fileExtension}`;
      const blob = recordedBlobRef.current;
      const measuredDuration = await getBlobDurationSeconds(previewUrl);
      const fallbackDuration = durationSeconds > 0 ? durationSeconds : null;
      const finalDuration = measuredDuration ?? fallbackDuration;

      const { error: uploadError } = await supabase.storage
        .from('timelapses')
        .upload(filePath, blob, { contentType: mimeType, upsert: false });

      if (uploadError) {
        throw uploadError;
      }

      const { data: signedData, error: signedError } = await supabase.storage
        .from('timelapses')
        .createSignedUrl(filePath, 60 * 60 * 24 * 30);

      if (signedError) {
        throw signedError;
      }

      const signedUrl = signedData?.signedUrl;

      if (!signedUrl) {
        throw new Error('Could not generate a signed URL for the uploaded video.');
      }

      const { data: existingRows, error: streakError } = await supabase
        .from('daily_timelapses')
        .select('entry_date')
        .eq('user_id', userId);

      if (streakError) {
        throw streakError;
      }

      const dateStrings = (existingRows ?? []).map((row) => row.entry_date).filter((date) => date !== todayDate);
      const streakCount = calculateStreakIncludingToday(dateStrings, todayDate);

      const { error: upsertError } = await supabase.from('daily_timelapses').upsert(
        {
          user_id: userId,
          entry_date: todayDate,
          video_url: signedUrl,
          source_storage_path: filePath,
          source_mime_type: mimeType,
          source_duration_seconds: finalDuration,
          processing_status: 'uploaded',
          streak_count: streakCount,
        },
        { onConflict: 'user_id,entry_date' }
      );

      if (upsertError) {
        throw upsertError;
      }

      setSuccessMessage('Saved. Your timelapse is uploaded and today is recorded.');
      router.push('/dashboard?saved=1');
    } catch (error) {
      setErrorMessage(error.message || 'Could not upload and save this timelapse.');
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return (
      <main>
        <section className="card">
          <h1>Record</h1>
          <p className="muted">Checking your session...</p>
        </section>
      </main>
    );
  }

  return (
    <main>
      <section className="card">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>Record Timelapse</h1>
            <p className="muted">
              Record, preview, and save your daily timelapse.
            </p>
          </div>
          <button type="button" onClick={() => router.push('/dashboard')}>
            Back to Dashboard
          </button>
        </div>

        <div className="space-top record-layout">
          <div className="item">
            <h3>Live Camera</h3>
            <video ref={liveVideoRef} autoPlay muted playsInline className="video-frame" />

            <div className="row space-top">
              <button type="button" onClick={startCamera} disabled={startingCamera || !!streamRef.current}>
                {startingCamera ? 'Starting camera...' : 'Start camera'}
              </button>
              <button type="button" onClick={stopCamera} disabled={!streamRef.current || recording}>
                Stop camera
              </button>
            </div>
          </div>

          <div className="item">
            <h3>Record</h3>
            <p className="muted">Duration: {durationSeconds}s</p>

            <div className="row">
              <button type="button" onClick={startRecording} disabled={!streamRef.current || recording}>
                Start recording
              </button>
              <button type="button" onClick={stopRecording} disabled={!recording}>
                Stop recording
              </button>
              <button type="button" onClick={resetRecording} disabled={!previewUrl || recording}>
                Clear preview
              </button>
              <button type="button" onClick={saveTodayEntry} disabled={!previewUrl || recording || uploading}>
                {uploading ? 'Saving...' : 'Save today entry'}
              </button>
            </div>

            {previewUrl ? (
              <div className="space-top">
                <h3>Preview</h3>
                <video src={previewUrl} controls playsInline className="video-frame" />
              </div>
            ) : (
              <p className="muted space-top">No preview yet. Record a clip to preview it here.</p>
            )}
          </div>
        </div>

        {successMessage ? <p className="space-top">{successMessage}</p> : null}
        {errorMessage ? <p className="space-top">Error: {errorMessage}</p> : null}
      </section>
    </main>
  );
}
