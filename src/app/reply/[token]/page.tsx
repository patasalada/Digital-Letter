import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import ReplyDesk from "@/components/ReplyDesk";

export default async function ReplyPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const service = createServiceClient();

  const { data: original } = await service
    .from("letters")
    .select("id, recipient_name, origin_label, unlock_timestamp")
    .eq("access_token", token)
    .single();

  if (!original) notFound();

  const isUnlocked = new Date(original.unlock_timestamp) <= new Date();
  if (!isUnlocked) notFound();

  return (
    <div className="min-h-full flex flex-col">
      <header className="px-6 py-4 border-b border-rule">
        <p className="text-xs uppercase tracking-[0.3em] text-muted">
          The Courier — Reply
        </p>
      </header>
      <main className="flex-1">
        <ReplyDesk
          originalLetterToken={token}
          originalLetterId={original.id}
          originalSenderName={original.recipient_name}
        />
      </main>
    </div>
  );
}
