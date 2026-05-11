import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { haversineKm, computeUnlockTimestamp, formatTransitDuration } from "@/lib/transit";
import { sendDispatchEmail } from "@/lib/resend";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const service = createServiceClient();

  // Fetch original letter to get recipient (= reply's sender) and sender (= reply's recipient)
  const { data: original } = await service
    .from("letters")
    .select("id, sender_id, guest_sender_email, recipient_name, unlock_timestamp")
    .eq("access_token", token)
    .single();

  if (!original) {
    return NextResponse.json({ error: "Original letter not found" }, { status: 404 });
  }

  if (new Date(original.unlock_timestamp) > new Date()) {
    return NextResponse.json({ error: "Letter not yet unlocked" }, { status: 403 });
  }

  // Resolve original sender's email (the reply recipient)
  let replyToEmail: string | null = null;
  if (original.sender_id) {
    const { data: userData } = await service.auth.admin.getUserById(original.sender_id);
    replyToEmail = userData?.user?.email ?? null;
  } else {
    replyToEmail = original.guest_sender_email;
  }

  if (!replyToEmail) {
    return NextResponse.json({ error: "Could not resolve reply recipient" }, { status: 500 });
  }

  const formData = await request.formData();
  const bodyText = formData.get("body_text")?.toString().trim();
  const guestEmail = formData.get("guest_email")?.toString().trim();
  const guestName = formData.get("guest_name")?.toString().trim() || null;
  const imageCount = parseInt(formData.get("image_count")?.toString() || "0");

  if (!bodyText) return NextResponse.json({ error: "Body is required" }, { status: 400 });
  if (!guestEmail) return NextResponse.json({ error: "Your email is required" }, { status: 400 });

  const originLat = parseFloat(formData.get("origin_lat")?.toString() || "");
  const originLng = parseFloat(formData.get("origin_lng")?.toString() || "");
  const originLabel = formData.get("origin_label")?.toString() || null;

  let distanceKm = 5000;
  if (!isNaN(originLat) && !isNaN(originLng)) {
    distanceKm = haversineKm(originLat, originLng, 0, 0);
  }

  const unlockTimestamp = computeUnlockTimestamp(distanceKm);
  const transitDays = formatTransitDuration(distanceKm);

  // Upload audio
  let audioUrl: string | null = null;
  const audioFile = formData.get("audio") as File | null;
  if (audioFile && audioFile.size > 0) {
    const ext = audioFile.name.endsWith(".mp4") ? "mp4" : "webm";
    const path = `guest/${Date.now()}.${ext}`;
    const { error } = await service.storage
      .from("letter-audio")
      .upload(path, audioFile, { contentType: audioFile.type });
    if (!error) audioUrl = path;
  }

  const { data: letter, error: insertError } = await service
    .from("letters")
    .insert({
      sender_id: null,
      guest_sender_email: guestEmail,
      guest_sender_name: guestName,
      recipient_email: replyToEmail,
      recipient_name: original.recipient_name,
      body_text: bodyText,
      audio_url: audioUrl,
      origin_lat: !isNaN(originLat) ? originLat : null,
      origin_lng: !isNaN(originLng) ? originLng : null,
      origin_label: originLabel,
      destination_lat: 0,
      destination_lng: 0,
      distance_km: distanceKm,
      unlock_timestamp: unlockTimestamp.toISOString(),
      in_reply_to: original.id,
    })
    .select("id, access_token")
    .single();

  if (insertError || !letter) {
    return NextResponse.json({ error: "Failed to save reply" }, { status: 500 });
  }

  // Upload images
  for (let i = 0; i < imageCount; i++) {
    const imgFile = formData.get(`image_${i}`) as File | null;
    const caption = formData.get(`caption_${i}`)?.toString() || "";
    if (!imgFile || imgFile.size === 0) continue;
    const ext = imgFile.type.split("/")[1] || "jpg";
    const path = `guest/${letter.id}/${i}.${ext}`;
    const { error } = await service.storage
      .from("letter-images")
      .upload(path, imgFile, { contentType: imgFile.type });
    if (!error) {
      await service.from("letter_images").insert({
        letter_id: letter.id,
        image_url: path,
        caption,
        display_order: i,
      });
    }
  }

  try {
    await sendDispatchEmail({
      recipientEmail: replyToEmail,
      recipientName: original.recipient_name,
      senderEmail: guestEmail,
      accessToken: letter.access_token,
      originLabel,
      transitDays,
    });
  } catch {
    console.error("Reply dispatch email failed for letter", letter.id);
  }

  return NextResponse.json({ access_token: letter.access_token });
}
