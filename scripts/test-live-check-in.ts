import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { users } from "../src/lib/db/schema/users";
import { sessions } from "../src/lib/db/schema/auth";

// Load .env first for DATABASE_URL, then .env.local for local overrides.
config({ path: ".env" });
config({ path: ".env.local", override: true });

const DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/myapp";
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://bodydebt.thisyearnofear.com";

async function main() {
  const sql = postgres(DATABASE_URL, { max: 1 });
  const db = drizzle(sql);

  const [user] = await db.select().from(users).where(eq(users.email, "test-patient@bodydebt.local")).limit(1);
  if (!user) {
    console.error("test-patient@bodydebt.local not found. Run scripts/test-escalation-email.ts first.");
    process.exit(1);
  }

  const sessionToken = randomUUID();
  await db.insert(sessions).values({
    sessionToken,
    userId: user.id,
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  const res = await fetch(`${SITE_URL}/api/care/check-in`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `__Secure-authjs.session-token=${sessionToken}`,
    },
    body: JSON.stringify({
      symptoms: ["vomiting"],
      symptomSeverity: "severe",
      adherence: "taken_as_prescribed",
    }),
  });

  const body = await res.json().catch(() => ({}));
  console.log(`Status: ${res.status}`);
  console.log(`Action: ${body?.action?.type}`);
  console.log(`Reason: ${body?.action?.reason}`);

  if (res.status !== 200) {
    console.error(body);
    process.exit(1);
  }

  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
