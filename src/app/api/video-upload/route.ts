import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const EXT_BY_TYPE: Record<string, string> = {
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
};

// Videos are too big for Vercel's request limit, so the browser uploads
// straight to storage with a one-time signed URL issued here.
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { contentType } = await request.json();
  const ext = EXT_BY_TYPE[contentType];
  if (!ext) return NextResponse.json({ error: "Unsupported video type" }, { status: 400 });

  const path = `${user.id}/${Date.now()}.${ext}`;
  const { data, error } = await createServiceClient()
    .storage.from("letter-video")
    .createSignedUploadUrl(path);

  if (error || !data) {
    return NextResponse.json({ error: "Could not start video upload" }, { status: 500 });
  }

  return NextResponse.json({ path: data.path, token: data.token });
}
