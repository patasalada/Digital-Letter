import { notFound, redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { signLetterMedia } from "@/lib/letter-media";
import LetterReader from "@/components/LetterReader";

export default async function LetterPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const service = createServiceClient();

  const { data: letter } = await service
    .from("letters")
    .select("*, letter_images(id, image_url, caption, display_order)")
    .eq("access_token", token)
    .single();

  if (!letter) notFound();

  const isUnlocked = new Date(letter.unlock_timestamp) <= new Date();
  if (!isUnlocked) redirect(`/transit/${token}`);

  // Mark opened
  if (!letter.opened_at) {
    await service
      .from("letters")
      .update({ opened_at: new Date().toISOString(), status: "opened" })
      .eq("access_token", token);
  }

  const { audioUrl, videoUrl, images } = await signLetterMedia(service, letter);

  return (
    <div className="min-h-full flex flex-col">
      <header className="px-6 py-4 border-b border-rule">
        <p className="text-xs uppercase tracking-[0.3em] text-muted">
          The Courier
        </p>
      </header>
      <main className="flex-1">
        <LetterReader
          letter={{
            body_text: letter.body_text,
            dispatched_at: letter.dispatched_at,
            origin_label: letter.origin_label,
            recipient_name: letter.recipient_name,
            weather_description: letter.weather_description ?? null,
          }}
          audioUrl={audioUrl}
          videoUrl={videoUrl}
          images={images}
          replyToken={token}
        />
      </main>
    </div>
  );
}
