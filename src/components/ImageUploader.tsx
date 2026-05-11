"use client";

import { useRef, useState } from "react";

export interface PendingImage {
  file: File;
  preview: string;
  caption: string;
}

interface Props {
  images: PendingImage[];
  onChange: (images: PendingImage[]) => void;
}

export default function ImageUploader({ images, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFiles(files: FileList | null) {
    if (!files) return;
    const incoming: PendingImage[] = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, 6 - images.length) // cap at 6 total
      .map((file) => ({
        file,
        preview: URL.createObjectURL(file),
        caption: "",
      }));
    onChange([...images, ...incoming]);
  }

  function remove(index: number) {
    const next = images.filter((_, i) => i !== index);
    onChange(next);
  }

  function setCaption(index: number, caption: string) {
    const next = images.map((img, i) => (i === index ? { ...img, caption } : img));
    onChange(next);
  }

  return (
    <div className="space-y-4">
      <p className="text-xs uppercase tracking-[0.2em] text-muted">
        Photos{" "}
        <span className="normal-case tracking-normal font-normal">
          (optional, up to 6)
        </span>
      </p>

      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {images.map((img, i) => (
            <div key={img.preview} className="space-y-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.preview}
                alt=""
                className="w-full h-32 object-cover border border-rule"
              />
              <input
                type="text"
                placeholder="Caption (optional)"
                value={img.caption}
                onChange={(e) => setCaption(i, e.target.value)}
                className="w-full text-xs bg-transparent border-b border-rule focus:border-foreground outline-none py-1 placeholder:text-muted"
              />
              <button
                type="button"
                onClick={() => remove(i)}
                className="text-xs text-muted underline hover:text-foreground cursor-pointer"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {images.length < 6 && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="text-sm border border-foreground px-4 py-2 hover:bg-foreground hover:text-background transition-colors cursor-pointer"
        >
          Add photos
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
