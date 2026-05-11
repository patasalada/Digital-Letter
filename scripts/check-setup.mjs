import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const pub = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secret = env.SUPABASE_SECRET_KEY;
const resend = env.RESEND_API_KEY;

const results = [];

// 1. Publishable key — hit auth settings endpoint
try {
  const r = await fetch(`${url}/auth/v1/settings`, {
    headers: { apikey: pub },
  });
  if (r.ok) {
    const data = await r.json();
    const google = data.external?.google;
    results.push(`[OK]   Publishable key works (auth endpoint reachable)`);
    results.push(
      `[${google ? "OK  " : "WARN"}] Google OAuth provider: ${google ? "ENABLED" : "NOT enabled in Supabase"}`,
    );
  } else {
    results.push(`[FAIL] Publishable key rejected: ${r.status} ${r.statusText}`);
  }
} catch (e) {
  results.push(`[FAIL] Publishable key check threw: ${e.message}`);
}

// 2. Secret key — hit storage buckets list (admin endpoint)
try {
  const r = await fetch(`${url}/storage/v1/bucket`, {
    headers: { apikey: secret, Authorization: `Bearer ${secret}` },
  });
  if (r.ok) {
    const buckets = await r.json();
    const names = buckets.map((b) => b.name);
    results.push(
      `[OK]   Secret key works (storage admin reachable). Existing buckets: ${names.length ? names.join(", ") : "(none yet)"}`,
    );
  } else {
    results.push(`[FAIL] Secret key rejected: ${r.status} ${r.statusText}`);
  }
} catch (e) {
  results.push(`[FAIL] Secret key check threw: ${e.message}`);
}

// 3. Resend
if (!resend) {
  results.push(`[WARN] RESEND_API_KEY is empty — sign up and paste it in.`);
} else {
  try {
    const r = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${resend}` },
    });
    if (r.ok) {
      const data = await r.json();
      const domains = (data.data || []).map((d) => `${d.name} (${d.status})`);
      results.push(
        `[OK]   Resend key works. Verified domains: ${domains.length ? domains.join(", ") : "(none — using onboarding@resend.dev)"}`,
      );
    } else {
      results.push(`[FAIL] Resend key rejected: ${r.status}`);
    }
  } catch (e) {
    results.push(`[FAIL] Resend key check threw: ${e.message}`);
  }
}

console.log(results.join("\n"));
