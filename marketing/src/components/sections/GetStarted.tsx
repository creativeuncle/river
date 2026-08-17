import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight02Icon } from "@hugeicons/core-free-icons";

export function GetStarted() {
  return (
    <section id="pricing" className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-4xl px-6">
        <div className="relative overflow-hidden rounded-3xl bg-slate-900 px-8 py-16 text-center sm:px-16">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_0%,rgba(47,111,237,0.35),rgba(15,23,42,0))]"
            aria-hidden
          />
          <div className="relative">
            <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Get started today.</h2>
            <p className="mx-auto mt-4 max-w-xl text-slate-300">
              Set up your widget in minutes and start talking to your customers in real time — free, no credit card
              needed.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href="/agent/login"
                className="inline-flex items-center gap-2 rounded-lg bg-[#2f6fed] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#1d4fc4]"
              >
                Start for Free
                <HugeiconsIcon icon={ArrowRight02Icon} size={16} />
              </a>
              <a
                href="#contact-sales"
                className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                Contact Sales
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
