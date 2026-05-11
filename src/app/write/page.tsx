import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import WritingDesk from "@/components/WritingDesk";
import SentLetters from "@/components/SentLetters";
import { signOut } from "../auth/actions";

export default async function WritePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const service = createServiceClient();
  const { data: letters } = await service
    .from("letters")
    .select("id, access_token, recipient_name, recipient_email, dispatched_at, unlock_timestamp, status, opened_at")
    .eq("sender_id", user.id)
    .order("dispatched_at", { ascending: false })
    .limit(20);

  return (
    <div className="min-h-full flex flex-col">
      <header className="flex justify-between items-center px-6 py-4 border-b border-rule">
        <p className="text-xs uppercase tracking-[0.3em] text-muted">Digital Letter</p>
        <form action={signOut}>
          <button
            type="submit"
            className="text-xs uppercase tracking-[0.2em] text-muted hover:text-foreground cursor-pointer"
          >
            Sign out
          </button>
        </form>
      </header>
      <main className="flex-1 max-w-2xl mx-auto w-full">
        <WritingDesk userId={user.id} />
        {letters && letters.length > 0 && (
          <div className="border-t border-rule mt-4">
            <SentLetters letters={letters} />
          </div>
        )}
      </main>
    </div>
  );
}
