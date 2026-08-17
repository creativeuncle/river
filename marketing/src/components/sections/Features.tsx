import { HugeiconsIcon } from "@hugeicons/react";
import {
  BoltIcon,
  ChartUpIcon,
  Clock01Icon,
  ColorsIcon,
  Robot01Icon,
  Shield01Icon,
} from "@hugeicons/core-free-icons";

const FEATURES = [
  {
    icon: BoltIcon,
    title: "Real-time messaging",
    description: "Reply to customers the moment they message you — no page refresh, no delay.",
  },
  {
    icon: ColorsIcon,
    title: "Fully customizable widget",
    description: "Match your brand — colors, logo, position, and welcome message, all from Settings.",
  },
  {
    icon: Clock01Icon,
    title: "Away messages & notifications",
    description: "Never leave a customer hanging — auto-reply and email alerts when your team is offline.",
  },
  {
    icon: ChartUpIcon,
    title: "Reports & analytics",
    description: "Track response time, resolution time, and CSAT to see how your team is really performing.",
  },
  {
    icon: Robot01Icon,
    title: "Canned replies",
    description: "Answer common questions in one keystroke with reusable, shareable saved replies.",
  },
  {
    icon: Shield01Icon,
    title: "Role-based permissions",
    description: "Owners, admins, and agents each get exactly the access they need — nothing more.",
  },
];

export function Features() {
  return (
    <section id="features" className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold text-[#2f6fed]">Features</span>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Everything you need to talk to customers
          </h2>
          <p className="mt-4 text-slate-600">
            River gives your team a single, focused place to handle every conversation — without the bloat.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-slate-200 bg-white p-6 transition-shadow hover:shadow-lg hover:shadow-slate-900/5">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#2f6fed]/10 text-[#2f6fed]">
                <HugeiconsIcon icon={f.icon} size={22} />
              </span>
              <h3 className="mt-4 text-base font-semibold text-slate-900">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
