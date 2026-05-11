"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface LetterMeta {
  recipient_name: string | null;
  origin_label: string | null;
  destination_label: string | null;
  distance_km: number | null;
  dispatched_at: string;
  unlock_timestamp: string;
  delivered_at: string | null;
  opened_at: string | null;
  status: string;
  access_token: string;
}

interface Props {
  letter: LetterMeta;
  token: string;
}

const QUOTES = [
  {
    text: "How much of human life is lost in waiting.",
    author: "Ralph Waldo Emerson",
  },
  {
    text: "Adopt the pace of nature: her secret is patience.",
    author: "Ralph Waldo Emerson",
  },
  {
    text: "The years teach much which the days never know.",
    author: "Ralph Waldo Emerson",
  },
  {
    text: "Time is but the stream I go a-fishing in. I drink at it; but while I drink I see the sandy bottom and detect how shallow it is.",
    author: "Henry David Thoreau",
  },
  {
    text: "You must live in the present, launch yourself on every wave, find your eternity in each moment.",
    author: "Henry David Thoreau",
  },
];

function useCountdown(unlockTimestamp: string) {
  const getRemaining = () =>
    Math.max(0, new Date(unlockTimestamp).getTime() - Date.now());
  const [remaining, setRemaining] = useState(getRemaining);

  useEffect(() => {
    if (remaining === 0) return;
    const id = setInterval(() => setRemaining(getRemaining()), 1000);
    return () => clearInterval(id);
  });

  const days = Math.floor(remaining / 86400000);
  const hours = Math.floor((remaining % 86400000) / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);

  return { remaining, days, hours, minutes, seconds };
}

function ProgressMap({ progress }: { progress: number }) {
  const dotX = 40 + (progress / 100) * 220;
  return (
    <svg viewBox="0 0 300 60" className="w-full max-w-lg" aria-hidden="true">
      <line x1="40" y1="30" x2="260" y2="30" stroke="currentColor"
        strokeWidth="1" strokeDasharray="4 4" className="text-rule" />
      <circle cx="40" cy="30" r="3" className="fill-foreground" />
      <circle cx="260" cy="30" r="3" className="fill-rule" />
      <circle cx={dotX} cy="30" r="5" className="fill-foreground" />
      <text x="40" y="50" textAnchor="middle" fontSize="7" className="fill-muted font-mono">ORIGIN</text>
      <text x="260" y="50" textAnchor="middle" fontSize="7" className="fill-muted font-mono">DESTINATION</text>
    </svg>
  );
}

export default function TransitLog({ letter, token }: Props) {
  const router = useRouter();
  const unlock = new Date(letter.unlock_timestamp);
  const dispatch = new Date(letter.dispatched_at);
  const now = new Date();
  const isUnlocked = unlock <= now;

  const totalDuration = unlock.getTime() - dispatch.getTime();
  const elapsed = Math.min(now.getTime() - dispatch.getTime(), totalDuration);
  const progress = totalDuration > 0 ? (elapsed / totalDuration) * 100 : 100;

  const { remaining, days, hours, minutes, seconds } = useCountdown(
    letter.unlock_timestamp,
  );

  const [skipState, setSkipState] = useState<"idle" | "quote" | "loading">("idle");
  const [quote] = useState(
    () => QUOTES[Math.floor(Math.random() * QUOTES.length)],
  );

  async function handleSkip() {
    setSkipState("quote");
  }

  async function handleOpen() {
    setSkipState("loading");
    await fetch(`/api/letters/${token}/skip`, { method: "POST" });
    router.push(`/letter/${token}`);
  }

  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

  const ledger = [
    { label: "Dispatched from local post", time: fmt(dispatch), done: true },
    {
      label: "In transit",
      time: isUnlocked ? null : `Est. arrival ${fmt(unlock)}`,
      done: !isUnlocked, active: !isUnlocked,
    },
    {
      label: "Delivered",
      time: letter.delivered_at ? fmt(new Date(letter.delivered_at)) : null,
      done: !!letter.delivered_at || isUnlocked,
    },
    {
      label: "Opened by recipient",
      time: letter.opened_at ? fmt(new Date(letter.opened_at)) : null,
      done: !!letter.opened_at,
    },
  ];

  return (
    <div className="space-y-10">
      <div className="space-y-1">
        <h1 className="text-2xl">
          {letter.recipient_name ? `A letter to ${letter.recipient_name}` : "A letter in transit"}
        </h1>
        {letter.origin_label && (
          <p className="text-sm text-muted">
            From {letter.origin_label}
            {letter.distance_km ? ` — ${Math.round(letter.distance_km).toLocaleString()} km` : ""}
          </p>
        )}
      </div>

      <div className="border-t border-rule pt-6">
        <ProgressMap progress={isUnlocked ? 100 : progress} />
      </div>

      <div className="border-t border-rule pt-6">
        {isUnlocked ? (
          <a
            href={`/letter/${token}`}
            className="inline-block text-sm border border-foreground px-6 py-3 hover:bg-foreground hover:text-background transition-colors"
          >
            Open your letter
          </a>
        ) : skipState === "idle" ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-muted">Arrives in</p>
              <p className="text-3xl font-mono tabular-nums">
                {days > 0 && `${days}d `}
                {String(hours).padStart(2, "0")}h{" "}
                {String(minutes).padStart(2, "0")}m{" "}
                {String(seconds).padStart(2, "0")}s
              </p>
            </div>
            <button
              onClick={handleSkip}
              className="text-xs text-muted underline underline-offset-2 hover:text-foreground transition-colors cursor-pointer"
            >
              I can&rsquo;t wait
            </button>
          </div>
        ) : skipState === "quote" ? (
          <div className="space-y-6 max-w-md">
            <blockquote className="space-y-2 border-l-2 border-rule pl-4">
              <p className="text-lg leading-relaxed italic">&ldquo;{quote.text}&rdquo;</p>
              {quote.author && (
                <footer className="text-xs text-muted">— {quote.author}</footer>
              )}
            </blockquote>
            <div className="space-y-3">
              <p className="text-sm text-muted">
                The wait is part of it. But it&rsquo;s your letter.
              </p>
              <button
                onClick={handleOpen}
                className="text-sm border border-foreground px-6 py-3 hover:bg-foreground hover:text-background transition-colors cursor-pointer"
              >
                Open it now
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted">Opening your letter&hellip;</p>
        )}
      </div>

      <div className="border-t border-rule pt-6 space-y-0">
        <p className="text-xs uppercase tracking-[0.2em] text-muted mb-4">Ledger</p>
        {ledger.map((entry) => (
          <div
            key={entry.label}
            className={`flex justify-between py-3 border-b border-rule text-sm ${!entry.done && !entry.active ? "text-muted" : ""}`}
          >
            <span className={entry.active ? "font-medium" : ""}>
              {entry.active && "→ "}{entry.label}
            </span>
            <span className="text-muted text-xs self-center">
              {entry.time || (entry.done ? "✓" : "—")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
