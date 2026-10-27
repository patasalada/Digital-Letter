import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const service = createServiceClient();

  // Public: anyone with the link can call this, so never select emails or ids.
  const { data: letter, error } = await service
    .from("letters")
    .select(
      "recipient_name, origin_label, destination_label, distance_km, dispatched_at, unlock_timestamp, delivered_at, opened_at, status, body_text",
    )
    .eq("access_token", token)
    .single();

  if (error || !letter) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Mark as opened if unlocked and first visit to letter
  const now = new Date();
  const isUnlocked = new Date(letter.unlock_timestamp) <= now;
  if (isUnlocked && !letter.opened_at) {
    await service
      .from("letters")
      .update({ opened_at: now.toISOString(), status: "opened" })
      .eq("access_token", token);
  }

  // Same rule as /letter: the body stays sealed until it arrives.
  const { body_text, ...transit } = letter;
  return NextResponse.json(isUnlocked ? { ...transit, body_text } : transit);
}
