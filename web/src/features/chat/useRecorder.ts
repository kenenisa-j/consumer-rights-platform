"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const MAX_VOICE_MS = 180_000;
const TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];

export interface Recording { blob: Blob; ms: number; mime: string }

/**
 * Records a voice message with the microphone. `start()` asks for permission, `stop()` returns the recording, `cancel()` throws it away.
 * Nothing is kept or sent by this hook: the caller decides.
 */
export function useRecorder() {
  const [recording, setRecording] = useState(false);
  const [ms, setMs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const began = useRef(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const done = useRef<((r: Recording | null) => void) | null>(null);

  const release = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    stream.current?.getTracks().forEach(t => t.stop());
    stream.current = null; rec.current = null; setRecording(false); setMs(0);
  }, []);

  const finish = useCallback((keep: boolean) => new Promise<Recording | null>(resolve => {
    const r = rec.current;
    if (!r || r.state === "inactive") { release(); resolve(null); return; }
    const mime = r.mimeType || "audio/webm";
    const length = Date.now() - began.current;
    done.current = resolve;
    r.onstop = () => {
      const blob = new Blob(chunks.current, { type: mime });
      chunks.current = [];
      release();
      done.current?.(keep && blob.size > 0 ? { blob, ms: length, mime } : null);
      done.current = null;
    };
    r.stop();
  }), [release]);

  const start = useCallback(async () => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Voice messages are not supported in this browser. Use a recent Chrome, Edge, Firefox or Safari."); return false;
    }
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = s;
      const type = TYPES.find(t => MediaRecorder.isTypeSupported(t));
      const r = new MediaRecorder(s, type ? { mimeType: type } : undefined);
      chunks.current = [];
      r.ondataavailable = e => { if (e.data.size > 0) chunks.current.push(e.data); };
      r.start(250);
      rec.current = r; began.current = Date.now(); setRecording(true); setMs(0);
      timer.current = setInterval(() => {
        const t = Date.now() - began.current;
        setMs(t);
        if (t >= MAX_VOICE_MS) void finish(true).then(x => x && window.dispatchEvent(new CustomEvent("voice-auto-stop", { detail: x })));
      }, 200);
      return true;
    } catch (e) {
      release();
      const denied = e instanceof DOMException && (e.name === "NotAllowedError" || e.name === "SecurityError");
      setError(denied ? "The microphone is blocked. Allow it in the address bar to send voice messages." : "No microphone was found.");
      return false;
    }
  }, [finish, release]);

  useEffect(() => () => { void finish(false); }, [finish]);
  return { recording, ms, error, clearError: () => setError(null), start, stop: () => finish(true), cancel: () => finish(false) };
}
