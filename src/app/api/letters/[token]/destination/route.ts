import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { haversineKm, computeUnlockTimestamp } from "@/lib/transit";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const { lat, lng, label } = await request.json();

  if (typeof lat !== "number" || typeof lng !== "number") {
    return NextResponse.json({ error: "Invalid coords" }, { status: 400 });
  }

  const service = createServiceClient();

  const { data: letter } = await service
    .from("letters")
    .select("id, origin_lat, origin_lng, dispatched_at, destination_lat, unlock_timestamp")
    .eq("access_token", token)
    .single();

  if (!letter) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Only update if destination hasn't been set by recipient yet (still 0,0 or null)
  const alreadySet =
    letter.destination_lat !== null &&
    letter.destination_lat !== 0;

  if (alreadySet) {
    return NextResponse.json({ ok: true, updated: false });
  }

  const originLat = letter.origin_lat ?? 0;
  const originLng = letter.origin_lng ?? 0;
  const distanceKm = haversineKm(originLat, originLng, lat, lng);
  const unlockTimestamp = computeUnlockTimestamp(distanceKm);

  // Don't shorten the transit time if the letter was already sent a while ago
  const dispatched = new Date(letter.dispatched_at);
  const currentUnlock = new Date(letter.unlock_timestamp);
  const newUnlock = new Date(
    dispatched.getTime() + (unlockTimestamp.getTime() - Date.now() + dispatched.getTime() - dispatched.getTime())
  );

  // Recalculate unlock as dispatched_at + transit_duration
  const transitMs = unlockTimestamp.getTime() - Date.now();
  const recalculated = new Date(dispatched.getTime() + transitMs + (Date.now() - dispatched.getTime()));

  // Use whichever is later — never shorten an already-running timer
  const finalUnlock = recalculated > currentUnlock ? recalculated : currentUnlock;

  await service
    .from("letters")
    .update({
      destination_lat: lat,
      destination_lng: lng,
      destination_label: label || null,
      distance_km: distanceKm,
      unlock_timestamp: finalUnlock.toISOString(),
    })
    .eq("access_token", token);

  return NextResponse.json({ ok: true, updated: true, distance_km: distanceKm });
}
