import { prisma } from "../prisma.js";

export type WebhookEvent = "conversation.created" | "conversation.closed" | "message.new";

// Fire-and-forget: POSTs the payload to every enabled webhook subscribed to
// this event. Failures are logged, never thrown — a slow or broken webhook
// endpoint must not block the request that triggered it.
export async function triggerWebhooks(accountId: string, event: WebhookEvent, payload: unknown): Promise<void> {
  const webhooks = await prisma.webhook.findMany({ where: { accountId, enabled: true, events: { has: event } } });
  if (webhooks.length === 0) return;

  await Promise.all(
    webhooks.map(async (hook) => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        await fetch(hook.url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event, data: payload, sentAt: new Date().toISOString() }),
          signal: controller.signal,
        });
        clearTimeout(timeout);
      } catch (err) {
        console.error(`Webhook delivery failed for ${hook.url} (${event}):`, err instanceof Error ? err.message : err);
      }
    })
  );
}
