"use client";

import { useState } from "react";
import AudioRecorder from "./AudioRecorder";
import ImageUploader, { type PendingImage } from "./ImageUploader";
import { getCurrentPosition } from "@/lib/geo";

interface Props {
  originalLetterToken: string;
  originalLetterId: string;
  originalSenderName: string | null;
}

type Step = "write" | "preview" | "sending" | "sent";

export default function ReplyDesk({
  originalLetterToken,
  originalSenderName,
}: Props) {
  const [step, setStep] = useState<Step>("write");
  const [body, setBody] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestName, setGuestName] = useState("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioMime, setAudioMime] = useState("");
  const [images, setImages] = useState<PendingImage[]>([]);
  const [error, setError] = useState("");
  const [sentToken, setSentToken] = useState("");

  function validate() {
    if (!body.trim()) return "Write something first.";
    if (!guestEmail.trim()) return "Your email is required so the recipient can reply.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) return "That doesn't look like a valid email.";
    return "";
  }

  async function handlePreview() {
    const err = validate();
    if (err) { setError(err); return; }
    setError("");
    setStep("preview");
  }

  async function handleSend() {
    setStep("sending");
    setError("");

    const formData = new FormData();
    formData.append("body_text", body);
    formData.append("guest_email", guestEmail);
    if (guestName) formData.append("guest_name", guestName);
    if (audioBlob) formData.append("audio", audioBlob, `audio.${audioMime.includes("mp4") ? "mp4" : "webm"}`);
    images.forEach((img, i) => {
      formData.append(`image_${i}`, img.file);
      formData.append(`caption_${i}`, img.caption);
    });
    formData.append("image_count", String(images.length));

    try {
      const pos = await getCurrentPosition();
      formData.append("origin_lat", String(pos.lat));
      formData.append("origin_lng", String(pos.lng));
      formData.append("origin_label", pos.label);
    } catch { /* location denied — proceed without */ }

    try {
      const res = await fetch(`/api/reply/${originalLetterToken}`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Send failed");
      setSentToken(data.access_token);
      setStep("sent");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setStep("write");
    }
  }

  if (step === "sent") {
    return (
      <div className="max-w-2xl mx-auto space-y-6 text-center py-16 px-6">
        <p className="text-xs uppercase tracking-[0.3em] text-muted">Dispatched</p>
        <h1 className="text-3xl">Your reply is in transit.</h1>
        <p className="text-muted">
          They&rsquo;ll receive an email when it arrives.
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
          <p className="text-sm text-muted">
            From: {guestName ? `${guestName} (${guestEmail})` : guestEmail}
          </p>
          {originalSenderName && (
            <p className="text-sm text-muted">To: {originalSenderName}</p>
          )}
        </div>

        <div className="border-t border-rule pt-8">
          <p className="whitespace-pre-wrap leading-relaxed">{body}</p>
        </div>

        {audioBlob && (
          <div className="border-t border-rule pt-4 space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-muted">Voice recording attached</p>
            <audio controls src={URL.createObjectURL(audioBlob)} className="w-full" />
          </div>
        )}

        {images.length > 0 && (
          <div className="border-t border-rule pt-4 space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] text-muted">{images.length} photo{images.length > 1 ? "s" : ""} attached</p>
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
      <div className="flex-1 flex items-center justify-center py-24">
        <p className="text-muted text-sm">Sending your reply&hellip;</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto w-full space-y-8 py-12 px-6">
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-[0.3em] text-muted">
          {originalSenderName ? `Reply to ${originalSenderName}` : "Send a reply"}
        </p>
        <p className="text-xs text-muted">No account needed. Once sent, your letter cannot be recalled.</p>
      </div>

      <div className="space-y-2">
        <input
          type="email"
          placeholder="Your email address"
          value={guestEmail}
          onChange={(e) => setGuestEmail(e.target.value)}
          className="w-full bg-transparent border-b border-rule focus:border-foreground outline-none py-2 text-sm placeholder:text-muted"
        />
        <input
          type="text"
          placeholder="Your name (optional)"
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
          className="w-full bg-transparent border-b border-rule focus:border-foreground outline-none py-2 text-sm placeholder:text-muted"
        />
      </div>

      <textarea
        placeholder="Write your reply here…"
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
