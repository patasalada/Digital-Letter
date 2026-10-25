import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const MEDIA = {
  video: {
    bucket: "letter-video",
    ext: { "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm" },
  },
  audio: {
    bucket: "letter-audio",
    ext: {
      "audio/mpeg": "mp3",
      "audio/mp3": "mp3",
      "audio/mp4": "mp4",
      "audio/x-m4a": "m4a",
      "audio/aac": "aac",
      "audio/wav": "wav",
      "audio/x-wav": "wav",
      "audio/webm": "webm",
      "audio/ogg": "ogg",
      "audio/flac": "flac",
      "audio/x-flac": "flac",
    },
  },
} as const;

// Media files can exceed Vercel's request limit, so the browser uploads
// straight to storage with a one-time signed URL issued here.
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { kind, contentType } = await request.json();
  const media = MEDIA[kind as keyof typeof MEDIA];
  if (!media) return NextResponse.json({ error: "Unsupported upload" }, { status: 400 });

  const baseType = String(contentType ?? "").split(";")[0].trim();
  const ext = (media.ext as Record<string, string>)[baseType];
  if (!ext) return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });

  const path = `${user.id}/${Date.now()}.${ext}`;
  const { data, error } = await createServiceClient()
    .storage.from(media.bucket)
    .createSignedUploadUrl(path);

  if (error || !data) {
    return NextResponse.json({ error: "Could not start upload" }, { status: 500 });
  }

  return NextResponse.json({ path: data.path, token: data.token });
}
