import { notFound, redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
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

  // Generate signed URLs for audio and images
  let audioSignedUrl: string | null = null;
  if (letter.audio_url) {
    const { data } = await service.storage
      .from("letter-audio")
      .createSignedUrl(letter.audio_url, 3600);
    audioSignedUrl = data?.signedUrl ?? null;
  }

  const images = await Promise.all(
    (letter.letter_images ?? [])
      .sort((a: { display_order: number }, b: { display_order: number }) => a.display_order - b.display_order)
      .map(async (img: { id: string; image_url: string; caption: string; display_order: number }) => {
        const { data } = await service.storage
          .from("letter-images")
          .createSignedUrl(img.image_url, 3600);
        return {
          id: img.id,
          signedUrl: data?.signedUrl ?? null,
          caption: img.caption,
        };
      }),
  );

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
          audioUrl={audioSignedUrl}
          images={images}
          replyToken={token}
        />
      </main>
    </div>
  );
}
