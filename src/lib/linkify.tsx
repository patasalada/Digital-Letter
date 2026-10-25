import type { ReactNode } from "react";

// Matches [words](https://...) or a bare URL. Bare URLs leave off trailing
// punctuation so "see https://x.com." links correctly.
const LINK_PATTERN =
  /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s]*[^\s.,;:!?)\]'"])/g;

export function linkify(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(LINK_PATTERN)) {
    const index = m.index ?? 0;
    if (index > last) parts.push(text.slice(last, index));
    const isLabeled = m[1] !== undefined;
    parts.push(
      <a
        key={index}
        href={isLabeled ? m[2] : m[3]}
        target="_blank"
        rel="noopener noreferrer"
        className={isLabeled ? "underline" : "underline break-all"}
      >
        {isLabeled ? m[1] : m[3]}
      </a>,
    );
    last = index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}
