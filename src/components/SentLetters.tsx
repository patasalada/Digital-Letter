interface Letter {
  id: string;
  access_token: string;
  recipient_name: string | null;
  recipient_email: string;
  dispatched_at: string;
  unlock_timestamp: string;
  status: string;
  opened_at: string | null;
}

interface Props {
  letters: Letter[];
}

function statusLabel(letter: Letter): string {
  const now = new Date();
  if (letter.opened_at) return "Opened";
  if (letter.status === "delivered") return "Delivered";
  if (new Date(letter.unlock_timestamp) <= now) return "Arrived";
  return "In transit";
}

export default function SentLetters({ letters }: Props) {
  return (
    <div className="px-6 py-10 space-y-4">
      <p className="text-xs uppercase tracking-[0.3em] text-muted">Sent</p>
      <div className="space-y-0">
        {letters.map((letter) => {
          const to = letter.recipient_name
            ? `${letter.recipient_name} (${letter.recipient_email})`
            : letter.recipient_email;
          const date = new Date(letter.dispatched_at).toLocaleDateString("en-US", {
            month: "short", day: "numeric", year: "numeric",
          });
          const status = statusLabel(letter);

          return (
            <a
              key={letter.id}
              href={`/transit/${letter.access_token}`}
              className="flex items-center justify-between py-3 border-b border-rule hover:opacity-60 transition-opacity group"
            >
              <div className="space-y-0.5">
                <p className="text-sm">{to}</p>
                <p className="text-xs text-muted">{date}</p>
              </div>
              <span className={`text-xs uppercase tracking-[0.15em] ${
                status === "Opened" ? "text-foreground" :
                status === "In transit" ? "text-muted" : "text-muted"
              }`}>
                {status}
              </span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
