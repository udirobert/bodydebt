import { config } from "dotenv";
import { buildMagicLinkEmail } from "../src/lib/auth/magic-link-email";
import { sendEmail } from "../src/lib/email";

config({ path: ".env" });
config({ path: ".env.local", override: true });

const email = process.argv[2] ?? process.env.CARE_TEAM_EMAIL ?? "hello@persidian.com";

async function main() {
  const testUrl = "https://bodydebt.thisyearnofear.com/api/auth/callback/email?token=test-token&email=test%40example.com";
  const { subject, text, html } = buildMagicLinkEmail(email, testUrl);

  await sendEmail({ to: email, subject, text, html });
  console.log(`Magic-link test email sent to: ${email}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
