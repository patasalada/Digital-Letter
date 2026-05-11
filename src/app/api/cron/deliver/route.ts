import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendDeliveryEmail } from "@/lib/resend";

// Vercel Cron calls this with a secret header. Check it in production.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (
    process.env.NODE_ENV === "production" &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = createServiceClient();

  // Find all in-transit letters whose unlock time has passed
  const { data: letters, error } = await service
    .from("letters")
    .select("id, access_token, recipient_email, recipient_name, sender_id, guest_sender_email")
    .eq("status", "in_transit")
    .lte("unlock_timestamp", new Date().toISOString());

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!letters || letters.length === 0) {
    return NextResponse.json({ delivered: 0 });
  }

  let delivered = 0;

  for (const letter of letters) {
    // Get sender email
    let senderEmail = letter.guest_sender_email;
    if (!senderEmail && letter.sender_id) {
      const { data: userData } = await service.auth.admin.getUserById(
        letter.sender_id,
      );
      senderEmail = userData?.user?.email ?? null;
    }

    try {
      await sendDeliveryEmail({
        recipientEmail: letter.recipient_email,
        recipientName: letter.recipient_name,
        senderEmail: senderEmail ?? "",
        accessToken: letter.access_token,
      });

      await service
        .from("letters")
        .update({
          status: "delivered",
          delivered_at: new Date().toISOString(),
        })
        .eq("id", letter.id);

      delivered++;
    } catch (e) {
      console.error("Failed to deliver letter", letter.id, e);
    }
  }

  return NextResponse.json({ delivered });
}
