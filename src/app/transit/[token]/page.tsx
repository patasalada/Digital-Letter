import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import TransitLog from "@/components/TransitLog";

export default async function TransitPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const service = createServiceClient();

  const { data: letter } = await service
    .from("letters")
    .select(
      "recipient_name, origin_label, destination_label, distance_km, dispatched_at, unlock_timestamp, delivered_at, opened_at, status, access_token",
    )
    .eq("access_token", token)
    .single();

  if (!letter) notFound();

  return (
    <div className="min-h-full flex flex-col">
      <header className="px-6 py-4 border-b border-rule">
        <p className="text-xs uppercase tracking-[0.3em] text-muted">
          Digital Letter — Transit Log
        </p>
      </header>
      <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-12">
        <TransitLog letter={letter} token={token} />
      </main>
    </div>
  );
}
