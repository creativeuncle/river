import { HugeiconsIcon } from "@hugeicons/react";
import { InboxIcon, TeamWorkIcon, Megaphone01Icon, Archive01Icon } from "@hugeicons/core-free-icons";

const ITEMS = [
  {
    icon: InboxIcon,
    title: "Unified inbox",
    description: "Every conversation, one list — sorted by what needs your attention first.",
  },
  {
    icon: TeamWorkIcon,
    title: "Team collaboration",
    description: "Assign chats, leave internal notes, and @mention teammates without leaving the thread.",
  },
  {
    icon: Megaphone01Icon,
    title: "Proactive engagement",
    description: "Reach out to visitors first with a timed, customizable 'need help?' prompt.",
  },
  {
    icon: Archive01Icon,
    title: "Searchable archives",
    description: "Every closed conversation stays searchable and exportable, whenever you need it.",
  },
];

export function PlatformSection() {
  return (
    <section className="bg-slate-50 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-2">
          <div>
            <span className="text-sm font-semibold text-[#2f6fed]">The platform</span>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              One platform. Endless ways to improve customer service.
            </h2>
            <p className="mt-4 text-slate-600">
              From the first hello to the closed ticket, River keeps your whole team aligned — so customers get fast,
              consistent answers every time.
            </p>

            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
              {ITEMS.map((item) => (
                <div key={item.title} className="flex gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#2f6fed] shadow-sm ring-1 ring-slate-200">
                    <HugeiconsIcon icon={item.icon} size={18} />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>
                    <p className="mt-1 text-sm text-slate-600">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Screenshot placeholder */}
          <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/5">
            <div className="flex aspect-[4/3] w-full items-center justify-center rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 text-slate-400">
              <p className="text-sm font-medium">Inbox screenshot placeholder</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
