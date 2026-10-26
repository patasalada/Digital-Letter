import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { signLetterMedia } from "@/lib/letter-media";
import LetterReader from "@/components/LetterReader";

// The sender's own copy: ignores the transit lock and never marks it opened.
export default async function SentLetterPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { token } = await params;
  const service = createServiceClient();

  const { data: letter } = await service
    .from("letters")
    .select("*, letter_images(id, image_url, caption, display_order)")
    .eq("access_token", token)
    .eq("sender_id", user.id)
    .single();

  if (!letter) notFound();

  const { audioUrl, videoUrl, images } = await signLetterMedia(service, letter);

  return (
    <div className="min-h-full flex flex-col">
      <header className="flex justify-between items-center px-6 py-4 border-b border-rule">
        <p className="text-xs uppercase tracking-[0.3em] text-muted">
          The Courier · Your copy
        </p>
        <a
          href="/write"
          className="text-xs uppercase tracking-[0.2em] text-muted hover:text-foreground"
        >
          Back
        </a>
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
          senderCopy
        />
      </main>
    </div>
  );
}
