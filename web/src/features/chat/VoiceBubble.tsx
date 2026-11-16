"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const BARS = 30;
const mmss = (ms: number) => { const s = Math.max(0, Math.round(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };

/** A steady-looking set of bar heights from the message id, so a voice message always looks the same. */
function heights(seed: string): number[] {
  let h = 2166136261;
  for (const c of seed) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return Array.from({ length: BARS }, () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return 22 + (Math.abs(h) % 78); });
}

/** Play and pause, a waveform that fills as it plays, and the time left. The recording is fetched the first time it is played. */
export function VoiceBubble({ id, durationMs, src }: { id: string; durationMs: number; src?: string }) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const url = useRef<string | null>(src ?? null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [failed, setFailed] = useState(false);
  const bars = useMemo(() => heights(id), [id]);

  useEffect(() => () => { audio.current?.pause(); if (url.current && !src) URL.revokeObjectURL(url.current); }, [src]);

  const toggle = async () => {
    setFailed(false);
    if (!audio.current) {
      try {
        if (!url.current) {
          const res = await fetch(`/api/messages/audio/${id}`, { credentials: "same-origin" });
          if (!res.ok) throw new Error("fetch");
          url.current = URL.createObjectURL(await res.blob());
        }
        const a = new Audio(url.current);
        a.ontimeupdate = () => setProgress(a.duration && Number.isFinite(a.duration) ? a.currentTime / a.duration : a.currentTime / (durationMs / 1000));
        a.onended = () => { setPlaying(false); setProgress(0); };
        a.onpause = () => setPlaying(false);
        a.onplay = () => setPlaying(true);
        audio.current = a;
      } catch { setFailed(true); return; }
    }
    const a = audio.current;
    if (a.paused) { document.querySelectorAll("audio").forEach(x => x.pause()); await a.play().catch(() => setFailed(true)); } else a.pause();
  };

  const left = playing || progress > 0 ? durationMs * (1 - progress) : durationMs;
  return (
    <div className="voice">
      <button type="button" className="voice__btn" onClick={toggle} aria-label={playing ? "Pause the voice message" : "Play the voice message"}>
        <svg viewBox="0 0 24 24" aria-hidden="true">{playing ? <path d="M7 5h4v14H7zM13 5h4v14h-4z" /> : <path d="M8 5v14l11-7z" />}</svg>
      </button>
      <div className="voice__wave" aria-hidden="true">
        {bars.map((h, i) => <i key={i} className={i / BARS < progress ? "on" : undefined} style={{ height: `${h}%` }} />)}
      </div>
      <span className="voice__time">{failed ? "Could not play" : mmss(left)}</span>
    </div>
  );
}

export { mmss };
