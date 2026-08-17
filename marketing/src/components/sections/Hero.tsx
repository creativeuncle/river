import { HugeiconsIcon } from "@hugeicons/react";
import { StarIcon, ArrowRight02Icon, MessageMultiple01Icon, UserIcon } from "@hugeicons/core-free-icons";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-white pt-16 pb-8 sm:pt-24">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[560px] bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(47,111,237,0.12),rgba(255,255,255,0))]"
        aria-hidden
      />

      <div className="mx-auto max-w-4xl px-6 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm">
          <span className="flex items-center gap-0.5 text-amber-400">
            {Array.from({ length: 5 }).map((_, i) => (
              <HugeiconsIcon key={i} icon={StarIcon} size={13} fill="currentColor" />
            ))}
          </span>
          <span className="text-slate-900">4.7</span>
          <span className="text-slate-400">·</span>
          <span>1,695+ reviews</span>
        </div>

        <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl md:text-6xl">
          Support your customers in real time, right from your website.
        </h1>

        <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">
          One dashboard for every customer conversation. Reply live, automate the rest, and never miss a message.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href="/agent/login"
            className="inline-flex items-center gap-2 rounded-lg bg-[#2f6fed] px-6 py-3 text-sm font-semibold text-white shadow-sm shadow-blue-500/20 transition-colors hover:bg-[#1d4fc4]"
          >
            Start for Free
            <HugeiconsIcon icon={ArrowRight02Icon} size={16} />
          </a>
          <a
            href="#contact-sales"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50"
          >
            Contact Sales
          </a>
        </div>

        <p className="mt-3 text-xs text-slate-400">No credit card required · Free forever plan available</p>
      </div>

      {/* Dashboard preview placeholder — swap for a real product screenshot */}
      <div className="mx-auto mt-16 max-w-5xl px-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-900/10">
          <div className="flex items-center gap-1.5 rounded-t-xl bg-slate-50 px-4 py-3">
            <span className="h-3 w-3 rounded-full bg-red-300" />
            <span className="h-3 w-3 rounded-full bg-amber-300" />
            <span className="h-3 w-3 rounded-full bg-emerald-300" />
          </div>
          <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-b-xl border-t border-slate-100 bg-gradient-to-b from-slate-50 to-white text-slate-400">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2f6fed]/10 text-[#2f6fed]">
              <HugeiconsIcon icon={MessageMultiple01Icon} size={28} />
            </span>
            <p className="text-sm font-medium">Dashboard preview coming soon</p>
            <span className="flex items-center gap-1 text-xs text-slate-300">
              <HugeiconsIcon icon={UserIcon} size={12} />
              Screenshot placeholder
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
