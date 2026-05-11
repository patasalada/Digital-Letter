"use client";

import { useState, useRef } from "react";

interface Props {
  onRecorded: (blob: Blob, mimeType: string) => void;
  onCleared: () => void;
}

type State = "idle" | "recording" | "done";

export default function AudioRecorder({ onRecorded, onCleared }: Props) {
  const [state, setState] = useState<State>("idle");
  const [seconds, setSeconds] = useState(0);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // iOS Safari prefers audio/mp4; fall back to webm
    const mimeType = MediaRecorder.isTypeSupported("audio/mp4")
      ? "audio/mp4"
      : "audio/webm";

    const recorder = new MediaRecorder(stream, { mimeType });
    chunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunksRef.current, { type: mimeType });
      onRecorded(blob, mimeType);
      setState("done");
    };

    recorder.start();
    mediaRef.current = recorder;
    setState("recording");
    setSeconds(0);
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
  }

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current);
    mediaRef.current?.stop();
  }

  function clearRecording() {
    setState("idle");
    setSeconds(0);
    onCleared();
  }

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-[0.2em] text-muted">
        Voice recording
      </p>

      {state === "idle" && (
        <button
          type="button"
          onClick={startRecording}
          className="text-sm border border-foreground px-4 py-2 hover:bg-foreground hover:text-background transition-colors cursor-pointer"
        >
          Record audio
        </button>
      )}

      {state === "recording" && (
        <div className="flex items-center gap-4">
          <span className="text-xs text-muted font-mono">{fmt(seconds)}</span>
          <span className="inline-block w-2 h-2 rounded-full bg-red-700 animate-pulse" />
          <button
            type="button"
            onClick={stopRecording}
            className="text-sm border border-foreground px-4 py-2 hover:bg-foreground hover:text-background transition-colors cursor-pointer"
          >
            Stop
          </button>
        </div>
      )}

      {state === "done" && (
        <div className="flex items-center gap-4">
          <span className="text-xs text-muted">Recording captured ({fmt(seconds)})</span>
          <button
            type="button"
            onClick={clearRecording}
            className="text-xs underline text-muted hover:text-foreground cursor-pointer"
          >
            Discard
          </button>
        </div>
      )}
    </div>
  );
}
