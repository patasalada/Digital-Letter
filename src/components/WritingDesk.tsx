"use client";

import { useState, useTransition } from "react";
import AudioRecorder from "./AudioRecorder";
import ImageUploader, { type PendingImage } from "./ImageUploader";
import VideoAttach, { type PendingVideo } from "./VideoAttach";
import { getCurrentPosition, type GeoResult } from "@/lib/geo";
import { createClient } from "@/lib/supabase/client";
import { haversineKm, formatTransitDuration } from "@/lib/transit";

interface Props {
  userId: string;
}

type Step = "write" | "preview" | "sending" | "sent";

export default function WritingDesk({ userId }: Props) {
  const [step, setStep] = useState<Step>("write");
  const [body, setBody] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioMime, setAudioMime] = useState<string>("");
  const [images, setImages] = useState<PendingImage[]>([]);
  const [video, setVideo] = useState<PendingVideo | null>(null);
  const [sendingNote, setSendingNote] = useState("");
  const [error, setError] = useState("");
  const [sentToken, setSentToken] = useState("");
  const [, startTransition] = useTransition();

  // Geo resolved at send time
  const [origin, setOrigin] = useState<GeoResult | null>(null);
  const [transitLabel, setTransitLabel] = useState("");

  function validate() {
    if (!body.trim()) return "Write something first.";
    if (!recipientEmail.trim()) return "Recipient email is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail))
      return "That doesn't look like a valid email.";
    return "";
  }

  async function handlePreview() {
    const err = validate();
    if (err) { setError(err); return; }
    setError("");

    // Resolve origin geo for transit estimate
    try {
      const pos = await getCurrentPosition();
      setOrigin(pos);
      // We don't know destination coords yet (just email), so use a fixed
      // mid-distance estimate for the preview label — actual calc happens server-side
      setTransitLabel("3–7 days (calculated on send)");
    } catch {
      setOrigin(null);
      setTransitLabel("3–14 days");
    }
    setStep("preview");
  }

  async function handleSend() {
    setStep("sending");
    setError("");

    try {
      let videoPath: string | null = null;
      if (video) {
        setSendingNote("Uploading your video. This can take a few minutes, so keep this tab open.");
        const urlRes = await fetch("/api/video-upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contentType: video.file.type }),
        });
        const urlData = await urlRes.json();
        if (!urlRes.ok) throw new Error(urlData.error || "Video upload failed");
        const { error: uploadError } = await createClient()
          .storage.from("letter-video")
          .uploadToSignedUrl(urlData.path, urlData.token, video.file, {
            contentType: video.file.type,
          });
        if (uploadError) throw new Error("Video upload failed. Try again.");
        videoPath = urlData.path;
      }
      setSendingNote("");

      const formData = new FormData();
      formData.append("body_text", body);
      formData.append("recipient_email", recipientEmail);
      if (recipientName) formData.append("recipient_name", recipientName);
      if (audioBlob) formData.append("audio", audioBlob, `audio.${audioMime.includes("mp4") ? "mp4" : "webm"}`);
      images.forEach((img, i) => {
        formData.append(`image_${i}`, img.file);
        formData.append(`caption_${i}`, img.caption);
      });
      formData.append("image_count", String(images.length));
      if (origin) {
        formData.append("origin_lat", String(origin.lat));
        formData.append("origin_lng", String(origin.lng));
        formData.append("origin_label", origin.label);
      }
      if (videoPath) formData.append("video_path", videoPath);

      const res = await fetch("/api/letters", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Send failed");
      setSentToken(data.access_token);
      setStep("sent");
    } catch (e) {
      setSendingNote("");
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setStep("write");
    }
  }

  if (step === "sent") {
    return (
      <div className="max-w-2xl mx-auto space-y-6 text-center py-16 px-6">
        <p className="text-xs uppercase tracking-[0.3em] text-muted">Dispatched</p>
        <h1 className="text-3xl">Your letter is in transit.</h1>
        <p className="text-muted">
          The recipient will receive an email when it arrives. You can follow
          its journey below.
        </p>
        <a
          href={`/transit/${sentToken}`}
          className="inline-block text-sm border border-foreground px-6 py-3 hover:bg-foreground hover:text-background transition-colors"
        >
          View transit log
        </a>
      </div>
    );
  }

  if (step === "preview") {
    return (
      <div className="max-w-2xl mx-auto space-y-8 py-16 px-6">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.3em] text-muted">Review before sending</p>
          <p className="text-sm text-muted">To: {recipientName ? `${recipientName} (${recipientEmail})` : recipientEmail}</p>
          {transitLabel && (
            <p className="text-sm text-muted">Estimated transit: {transitLabel}</p>
          )}
        </div>

        <div className="border-t border-rule pt-8">
          <p className="whitespace-pre-wrap leading-relaxed">{body}</p>
        </div>

        {audioBlob && (
          <div className="border-t border-rule pt-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted mb-2">Voice recording attached</p>
            <audio controls src={URL.createObjectURL(audioBlob)} className="w-full" />
          </div>
        )}

        {video && (
          <div className="border-t border-rule pt-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted mb-2">Video attached</p>
            <video controls playsInline src={video.preview} className="max-w-full max-h-80 border border-rule" />
          </div>
        )}

        {images.length > 0 && (
          <div className="border-t border-rule pt-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted mb-3">{images.length} photo{images.length > 1 ? "s" : ""} attached</p>
            <div className="grid grid-cols-3 gap-2">
              {images.map((img) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={img.preview} src={img.preview} alt={img.caption} className="w-full h-24 object-cover border border-rule" />
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-rule pt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setStep("write")}
            className="text-xs underline text-muted hover:text-foreground cursor-pointer"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={handleSend}
            className="text-sm border border-foreground px-6 py-3 hover:bg-foreground hover:text-background transition-colors cursor-pointer"
          >
            Send
          </button>
        </div>
      </div>
    );
  }

  if (step === "sending") {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted text-sm">{sendingNote || "Sending your letter…"}</p>
      </div>
    );
  }

  // step === "write"
  return (
    <div className="max-w-2xl mx-auto w-full space-y-8 py-12 px-6">
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-[0.3em] text-muted">The writing desk</p>
      </div>

      <div className="space-y-2">
        <input
          type="email"
          placeholder="Recipient email"
          value={recipientEmail}
          onChange={(e) => setRecipientEmail(e.target.value)}
          className="w-full bg-transparent border-b border-rule focus:border-foreground outline-none py-2 text-sm placeholder:text-muted"
        />
        <input
          type="text"
          placeholder="Recipient name (optional)"
          value={recipientName}
          onChange={(e) => setRecipientName(e.target.value)}
          className="w-full bg-transparent border-b border-rule focus:border-foreground outline-none py-2 text-sm placeholder:text-muted"
        />
      </div>

      <textarea
        placeholder="Write your letter here…"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={14}
        className="w-full bg-transparent border border-rule focus:border-foreground outline-none p-4 resize-none text-base leading-relaxed placeholder:text-muted"
      />

      <AudioRecorder
        onRecorded={(blob, mime) => { setAudioBlob(blob); setAudioMime(mime); }}
        onCleared={() => { setAudioBlob(null); setAudioMime(""); }}
      />

      <ImageUploader images={images} onChange={setImages} />

      <VideoAttach video={video} onChange={setVideo} />

      {error && <p className="text-sm text-red-700">{error}</p>}

      <div className="border-t border-rule pt-6 flex justify-end">
        <button
          type="button"
          onClick={handlePreview}
          className="text-sm border border-foreground px-6 py-3 hover:bg-foreground hover:text-background transition-colors cursor-pointer"
        >
          Review &amp; send
        </button>
      </div>
    </div>
  );
}
