import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { haversineKm, computeUnlockTimestamp, formatTransitDuration } from "@/lib/transit";
import { sendDispatchEmail } from "@/lib/resend";
import { fetchWeather } from "@/lib/weather";

// Geocode a city/country string to lat/lng using Nominatim
async function geocodeLabel(label: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(label)}&format=json&limit=1`,
      { headers: { "Accept-Language": "en" } },
    );
    const data = await res.json();
    if (data[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch { /* ignore */ }
  return null;
}

export async function POST(request: NextRequest) {
  // Authenticate sender
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const bodyText = formData.get("body_text")?.toString().trim();
  const recipientEmail = formData.get("recipient_email")?.toString().trim();
  const recipientName = formData.get("recipient_name")?.toString().trim() || null;
  const imageCount = parseInt(formData.get("image_count")?.toString() || "0");

  if (!bodyText) return NextResponse.json({ error: "Body is required" }, { status: 400 });
  if (!recipientEmail) return NextResponse.json({ error: "Recipient email is required" }, { status: 400 });

  const service = createServiceClient();

  // Parse origin from form
  const originLat = parseFloat(formData.get("origin_lat")?.toString() || "");
  const originLng = parseFloat(formData.get("origin_lng")?.toString() || "");
  const originLabel = formData.get("origin_label")?.toString() || null;

  // Use a default destination coord (we don't have recipient's location).
  // We geocode originLabel only — destination defaults to a global midpoint.
  // Real apps could ask recipient location later; for now distance = origin → 0,0 fallback.
  let distanceKm = 5000; // conservative default
  let destLat: number | null = null;
  let destLng: number | null = null;

  if (!isNaN(originLat) && !isNaN(originLng)) {
    // Use 0,0 as a neutral destination until we have recipient coords
    // This gives a mid-range transit time (~5–8 days) for most origins
    destLat = 0;
    destLng = 0;
    distanceKm = haversineKm(originLat, originLng, destLat, destLng);
  }

  const unlockTimestamp = computeUnlockTimestamp(distanceKm);
  const transitDays = formatTransitDuration(distanceKm);

  // Fetch weather at origin at time of writing
  const weatherDescription =
    !isNaN(originLat) && !isNaN(originLng)
      ? await fetchWeather(originLat, originLng)
      : null;

  // Upload audio if present
  let audioUrl: string | null = null;
  const audioFile = formData.get("audio") as File | null;
  if (audioFile && audioFile.size > 0) {
    const ext = audioFile.name.endsWith(".mp4") ? "mp4" : "webm";
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error: uploadError } = await service.storage
      .from("letter-audio")
      .upload(path, audioFile, { contentType: audioFile.type });
    if (!uploadError) audioUrl = path;
  }

  // Insert letter
  const { data: letter, error: insertError } = await service
    .from("letters")
    .insert({
      sender_id: user.id,
      recipient_email: recipientEmail,
      recipient_name: recipientName,
      body_text: bodyText,
      audio_url: audioUrl,
      origin_lat: !isNaN(originLat) ? originLat : null,
      origin_lng: !isNaN(originLng) ? originLng : null,
      origin_label: originLabel,
      destination_lat: destLat,
      destination_lng: destLng,
      distance_km: distanceKm,
      unlock_timestamp: unlockTimestamp.toISOString(),
      weather_description: weatherDescription,
    })
    .select("id, access_token")
    .single();

  if (insertError || !letter) {
    return NextResponse.json({ error: "Failed to save letter" }, { status: 500 });
  }

  // Upload images
  if (imageCount > 0) {
    for (let i = 0; i < imageCount; i++) {
      const imgFile = formData.get(`image_${i}`) as File | null;
      const caption = formData.get(`caption_${i}`)?.toString() || "";
      if (!imgFile || imgFile.size === 0) continue;

      const ext = imgFile.type.split("/")[1] || "jpg";
      const path = `${user.id}/${letter.id}/${i}.${ext}`;
      const { error: imgUploadError } = await service.storage
        .from("letter-images")
        .upload(path, imgFile, { contentType: imgFile.type });

      if (!imgUploadError) {
        await service.from("letter_images").insert({
          letter_id: letter.id,
          image_url: path,
          caption,
          display_order: i,
        });
      }
    }
  }

  // Send dispatch email
  try {
    await sendDispatchEmail({
      recipientEmail,
      recipientName,
      senderEmail: user.email!,
      accessToken: letter.access_token,
      originLabel,
      transitDays,
    });
  } catch {
    // Non-fatal — letter is saved, email failed. Log and continue.
    console.error("Dispatch email failed for letter", letter.id);
  }

  return NextResponse.json({ access_token: letter.access_token });
}
