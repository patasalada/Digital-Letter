"use client";

import { useRef, useState } from "react";

// Supabase free plan caps each stored file at 50 MB.
const MAX_VIDEO_BYTES = 50 * 1000 * 1000;
const ACCEPTED = ["video/mp4", "video/quicktime", "video/webm"];

export interface PendingVideo {
  file: File;
  preview: string;
}

interface Props {
  video: PendingVideo | null;
  onChange: (video: PendingVideo | null) => void;
}

export default function VideoAttach({ video, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");

  function handleFile(file: File | undefined) {
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) {
      setError("Use an MP4, MOV, or WebM video.");
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      setError(
        `That video is ${Math.round(file.size / 1e6)} MB. The limit is 50 MB.`,
      );
      return;
    }
    setError("");
    onChange({ file, preview: URL.createObjectURL(file) });
  }

  return (
    <div className="space-y-4">
      <p className="text-xs uppercase tracking-[0.2em] text-muted">
        Video{" "}
        <span className="normal-case tracking-normal font-normal">
          (optional, up to 50 MB)
        </span>
      </p>

      {video ? (
        <div className="space-y-1">
          <video
            src={video.preview}
            controls
            playsInline
            className="max-w-full max-h-80 border border-rule"
          />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-xs text-muted underline hover:text-foreground cursor-pointer"
          >
            Remove
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="text-sm border border-foreground px-4 py-2 hover:bg-foreground hover:text-background transition-colors cursor-pointer"
        >
          Add a video
        </button>
      )}

      {error && <p className="text-sm text-red-700">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
