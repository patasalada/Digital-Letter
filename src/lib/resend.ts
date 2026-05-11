import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = `${process.env.COURIER_FROM_NAME || "The Courier"} <${process.env.COURIER_FROM_EMAIL || "onboarding@resend.dev"}>`;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function sendDispatchEmail({
  recipientEmail,
  recipientName,
  senderEmail,
  accessToken,
  originLabel,
  transitDays,
}: {
  recipientEmail: string;
  recipientName?: string | null;
  senderEmail: string;
  accessToken: string;
  originLabel?: string | null;
  transitDays: string;
}) {
  const greeting = recipientName ? `Dear ${recipientName},` : "Dear recipient,";
  const from = originLabel ? ` from ${originLabel}` : "";

  await resend.emails.send({
    from: FROM,
    to: recipientEmail,
    replyTo: senderEmail,
    subject: "A letter is on its way to you",
    text: `${greeting}

Someone has sent you a letter${from}. It is currently in transit and will arrive in approximately ${transitDays}.

You can follow its journey here:
${APP_URL}/transit/${accessToken}

You will receive another message when it is ready to open.

— The Courier`,
  });
}

export async function sendDeliveryEmail({
  recipientEmail,
  recipientName,
  senderEmail,
  accessToken,
}: {
  recipientEmail: string;
  recipientName?: string | null;
  senderEmail: string;
  accessToken: string;
}) {
  const greeting = recipientName ? `Dear ${recipientName},` : "Dear recipient,";

  await resend.emails.send({
    from: FROM,
    to: recipientEmail,
    replyTo: senderEmail,
    subject: "Your letter has arrived",
    text: `${greeting}

Your letter has arrived. It is ready to open.

${APP_URL}/letter/${accessToken}

— The Courier`,
  });
}
