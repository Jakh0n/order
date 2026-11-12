import { toDraft } from "@/lib/ai/menu-schema";
import { aiConfigured, streamMenu } from "@/lib/ai/openai";
import { getCurrentOwner } from "@/lib/auth/owner";
import { readImportForm } from "@/lib/menu/import-input";
import { isPro } from "@/lib/plan";
import { rateLimit, RULES } from "@/lib/rate-limit";
import { reportError } from "@/lib/report-error";

// Reading a big menu takes ~1 minute
export const maxDuration = 120;

/**
 * AI menu reading with live progress. Answers with NDJSON, one event per line:
 *   {"type":"progress","progress":{categories:[{name, items:[{name, price}]}]}}
 *   {"type":"done","draft":ImportDraft} | {"type":"error","error":"…"}
 * Nothing is saved here — importMenu (Server Action) saves the reviewed draft.
 */
export async function POST(request: Request) {
  const owner = await getCurrentOwner();
  if (!owner) return Response.json({ type: "error", error: "unauthorized" }, { status: 401 });
  const { store } = owner;
  if (!aiConfigured()) return Response.json({ type: "error", error: "notConfigured" });

  const input = await readImportForm(await request.formData());
  if (!input.ok) return Response.json({ type: "error", error: input.error });

  // OpenAI costs money: per store, per 30 days, by plan
  const rule = isPro(store) ? RULES.menuImportPro : RULES.menuImportFree;
  if (!(await rateLimit(rule, store.id))) return Response.json({ type: "error", error: "tooMany" });

  const encoder = new TextEncoder();
  const body = new ReadableStream({
    async start(controller) {
      const send = (event: unknown) =>
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      try {
        const menu = await streamMenu(
          { images: input.images, text: input.text, currency: store.currency },
          (progress) => send({ type: "progress", progress }),
        );
        const draft = toDraft(menu);
        send(draft.categories.length ? { type: "done", draft } : { type: "error", error: "empty" });
      } catch (e) {
        reportError(e, "menuImport.stream");
        send({ type: "error", error: "server" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      // Proxies must not buffer the stream
      "X-Accel-Buffering": "no",
    },
  });
}
