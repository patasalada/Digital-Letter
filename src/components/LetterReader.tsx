"use client";

import { useState } from "react";
import Postmark from "./Postmark";

interface Props {
  letter: {
    body_text: string;
    dispatched_at: string;
    origin_label: string | null;
    recipient_name: string | null;
    weather_description: string | null;
  };
  audioUrl: string | null;
  videoUrl: string | null;
  images: { id: string; signedUrl: string | null; caption: string }[];
  replyToken: string;
}

type Page = "envelope" | "letter" | "photos";

// Trailing punctuation is excluded so "see https://x.com." links correctly.
const URL_PATTERN = /(https?:\/\/[^\s]*[^\s.,;:!?)\]'"])/g;

function linkify(text: string) {
  return text.split(URL_PATTERN).map((part, i) =>
    i % 2 === 1 ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="underline break-all"
      >
        {part}
      </a>
    ) : (
      part
    ),
  );
}

export default function LetterReader({
  letter,
  audioUrl,
  videoUrl,
  images,
  replyToken,
}: Props) {
  const [page, setPage] = useState<Page>("envelope");

  const dispatchDate = new Date(letter.dispatched_at).toLocaleDateString(
    "en-US",
    { year: "numeric", month: "long", day: "numeric" },
  );

  if (page === "envelope") {
    return (
      <div className="flex-1 flex items-center justify-center px-6 py-24 text-center">
        <div className="space-y-8 max-w-md">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-muted">
              You have a letter
            </p>
            {letter.recipient_name && (
              <p className="text-2xl">For {letter.recipient_name}</p>
            )}
            <p className="text-sm text-muted">
              Written {dispatchDate}
              {letter.origin_label ? ` from ${letter.origin_label}` : ""}
            </p>
          </div>

          <div
            className="cursor-pointer hover:opacity-60 transition-opacity"
            onClick={() => setPage("letter")}
          >
            <div className="text-8xl">✉</div>
          </div>
        </div>
      </div>
    );
  }

  if (page === "photos" && images.length > 0) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-12 space-y-8">
        <div className="flex items-center justify-between border-b border-rule pb-4">
          <p className="text-xs uppercase tracking-[0.3em] text-muted">
            Photos
          </p>
          <button
            onClick={() => setPage("letter")}
            className="text-xs underline text-muted hover:text-foreground cursor-pointer"
          >
            Back to letter
          </button>
        </div>

        <div className="space-y-8">
          {images.map((img) =>
            img.signedUrl ? (
              <div key={img.id} className="space-y-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.signedUrl}
                  alt={img.caption}
                  className="w-full border border-rule"
                />
                {img.caption && (
                  <p className="text-sm text-muted italic">{img.caption}</p>
                )}
              </div>
            ) : null,
          )}
        </div>

        <div className="border-t border-rule pt-8">
          <a
            href={`/reply/${replyToken}`}
            className="text-sm border border-foreground px-6 py-3 hover:bg-foreground hover:text-background transition-colors inline-block"
          >
            Send a reply
          </a>
        </div>
      </div>
    );
  }

  // page === "letter"
  return (
    <div className="max-w-2xl mx-auto px-6 py-12 space-y-10">
      <div className="flex items-start justify-between gap-4 border-b border-rule pb-6">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-muted">
            {dispatchDate}
            {letter.origin_label ? ` — ${letter.origin_label}` : ""}
            {letter.weather_description ? ` · ${letter.weather_description}` : ""}
          </p>
          {letter.recipient_name && (
            <p className="text-lg">Dear {letter.recipient_name},</p>
          )}
        </div>
        {letter.origin_label && (
          <div className="shrink-0">
            <Postmark
              city={letter.origin_label}
              date={new Date(letter.dispatched_at).toLocaleDateString("en-US", {
                month: "short", day: "numeric", year: "numeric",
              }).toUpperCase()}
            />
          </div>
        )}
      </div>

      {audioUrl && (
        <div className="border-b border-rule pb-6 space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-muted">
            Voice recording
          </p>
          <audio controls src={audioUrl} className="w-full" />
        </div>
      )}

      <div className="leading-relaxed text-base whitespace-pre-wrap">
        {linkify(letter.body_text)}
      </div>

      {videoUrl && (
        <div className="border-t border-rule pt-6 space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-muted">
            Video
          </p>
          <video
            controls
            playsInline
            preload="metadata"
            src={videoUrl}
            className="mx-auto max-w-full max-h-[80vh] border border-rule"
          />
        </div>
      )}

      <div className="border-t border-rule pt-6 flex items-center justify-between">
        {images.length > 0 ? (
          <button
            onClick={() => setPage("photos")}
            className="text-sm border border-foreground px-6 py-3 hover:bg-foreground hover:text-background transition-colors cursor-pointer"
          >
            View photos ({images.length})
          </button>
        ) : (
          <span />
        )}
        <a
          href={`/reply/${replyToken}`}
          className="text-sm border border-foreground px-6 py-3 hover:bg-foreground hover:text-background transition-colors inline-block"
        >
          Send a reply
        </a>
      </div>
    </div>
  );
}
