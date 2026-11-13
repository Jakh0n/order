// Usage: npm run telegram:webhook -- https://www.flami.org
// Registers the Flami bot's webhook (<site>/api/telegram) with Telegram.
// Needs TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_SECRET in the environment (same values as on Vercel).
import { loadEnvFile } from "node:process";

try {
  loadEnvFile(".env");
} catch {
  // no .env — use the shell environment
}

async function main() {
  const site = process.argv[2]?.trim().replace(/\/$/, "");
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!site?.startsWith("https://") || !token || !secret) {
    console.error(
      "Usage: npm run telegram:webhook -- https://your-domain\n" +
        "Set TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_SECRET first.",
    );
    process.exit(1);
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: `${site}/api/telegram`,
      secret_token: secret,
      allowed_updates: ["message", "callback_query", "my_chat_member"],
      drop_pending_updates: true,
    }),
  });
  const data = (await res.json()) as { ok: boolean; description?: string };
  if (!data.ok) {
    console.error("Telegram refused:", data.description);
    process.exit(1);
  }
  console.log(`Webhook set: ${site}/api/telegram`);
}

main();
