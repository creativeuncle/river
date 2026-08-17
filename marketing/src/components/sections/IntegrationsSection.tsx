import { HugeiconsIcon } from "@hugeicons/react";
import { WebhookIcon, ZapIcon, SlackIcon, GlobeIcon, Mail01Icon, WhatsappIcon } from "@hugeicons/core-free-icons";

const INTEGRATIONS = [
  { icon: WebhookIcon, label: "Webhooks" },
  { icon: ZapIcon, label: "Zapier" },
  { icon: SlackIcon, label: "Slack" },
  { icon: GlobeIcon, label: "Any website" },
  { icon: Mail01Icon, label: "Email" },
  { icon: WhatsappIcon, label: "WhatsApp" },
];

export function IntegrationsSection() {
  return (
    <section id="how-to-use" className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6 text-center">
        <span className="text-sm font-semibold text-[#2f6fed]">Integrations</span>
        <h2 className="mx-auto mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          How integrations should be
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-slate-600">
          Drop one script tag on your site and River just works. Connect the tools your team already uses — no
          engineering project required.
        </p>

        <div className="mx-auto mt-14 grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {INTEGRATIONS.map((item) => (
            <div
              key={item.label}
              className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-8 transition-shadow hover:shadow-lg hover:shadow-slate-900/5"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 text-slate-700">
                <HugeiconsIcon icon={item.icon} size={22} />
              </span>
              <span className="text-xs font-medium text-slate-600">{item.label}</span>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-14 max-w-2xl rounded-2xl border border-slate-200 bg-slate-900 p-6 text-left shadow-xl">
          <div className="mb-3 flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
          </div>
          <pre className="overflow-x-auto text-xs leading-relaxed text-slate-300">
            <code>{`<script>
  window.__river = { siteId: "your-site-id" };
</script>
<script src="https://yourapp.com/widget.js" async></script>`}</code>
          </pre>
        </div>
      </div>
    </section>
  );
}
