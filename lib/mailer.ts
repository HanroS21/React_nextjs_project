import nodemailer from "nodemailer";

export async function sendUnlockEmail(
  to: string,
  username: string,
  code: string,
  minutes: number
): Promise<void> {
  const host = process.env.SMTP_HOST;

  if (!host) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SMTP_HOST is not set, so the unlock email cannot be sent.");
    }
    // Local testing only: show the code in the terminal instead of emailing it.
    console.log(`[dev] Unlock code for ${username}: ${code}`);
    return;
  }

  const port = Number(process.env.SMTP_PORT) || 587;
  const transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  await transport.sendMail({
    from: process.env.SMTP_FROM ?? "Mini Weather <no-reply@example.com>",
    to,
    subject: "Your Mini Weather unlock code",
    text: [
      `Your account (${username}) was locked after too many failed sign-in attempts.`,
      "",
      `Unlock code: ${code}`,
      "",
      `The code expires in ${minutes} minutes. If you did not try to sign in, change your password once you are back in.`,
    ].join("\n"),
  });
}