import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signInWithGoogle } from "./auth/actions";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/write");
  }

  const { error } = await searchParams;

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="max-w-xl w-full space-y-12 text-center">
        <header className="space-y-4">
          <p className="text-xs uppercase tracking-[0.3em] text-muted">
            Digital Letter
          </p>
          <h1 className="text-4xl md:text-5xl leading-tight">
            Write something worth waiting for.
          </h1>
        </header>

        <div className="border-t border-rule pt-10 space-y-4">
          <form action={signInWithGoogle}>
            <button
              type="submit"
              className="px-6 py-3 border border-foreground text-foreground hover:bg-foreground hover:text-background transition-colors text-sm uppercase tracking-[0.2em] cursor-pointer"
            >
              Sign in with Google
            </button>
          </form>
          {error && (
            <p className="text-xs text-red-700 pt-2">
              Sign-in failed. Please try again.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
