import { HugeiconsIcon } from "@hugeicons/react";
import { StarIcon } from "@hugeicons/core-free-icons";

interface Review {
  name: string;
  designation: string;
  review: string;
  rating: number;
}

const REVIEWS: Review[] = [
  {
    name: "Ananya Sharma",
    designation: "Head of Support, Loopkart",
    review: "River cut our first-response time in half. The widget setup took five minutes, not five days.",
    rating: 5,
  },
  {
    name: "Marcus Webb",
    designation: "Founder, Studio North",
    review: "Finally a livechat tool that doesn't feel like enterprise software. Clean, fast, and our team loves it.",
    rating: 5,
  },
  {
    name: "Priya Nair",
    designation: "Ops Manager, Fetchly",
    review: "The canned replies and internal notes alone saved us hours every week. Great value for the price.",
    rating: 4,
  },
  {
    name: "Daniel Cho",
    designation: "CX Lead, Brightpath",
    review: "Reports actually show us what's slow and where. We fixed our response time within the first month.",
    rating: 5,
  },
  {
    name: "Sara Ibrahim",
    designation: "Founder, Nudge Commerce",
    review: "Setup was genuinely a copy-paste job. Our customers started chatting with us the same afternoon.",
    rating: 5,
  },
  {
    name: "Tom Reyes",
    designation: "Support Engineer, Vantable",
    review: "The away-message and offline email alerts mean we never miss a customer overnight anymore.",
    rating: 4,
  },
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <div className="flex w-80 shrink-0 flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-0.5 text-amber-400">
        {Array.from({ length: 5 }).map((_, i) => (
          <HugeiconsIcon key={i} icon={StarIcon} size={14} fill={i < review.rating ? "currentColor" : "none"} />
        ))}
      </div>
      <p className="text-sm leading-relaxed text-slate-700">&ldquo;{review.review}&rdquo;</p>
      <div className="mt-auto flex items-center gap-3 pt-2">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2f6fed]/10 text-xs font-semibold text-[#2f6fed]">
          {initials(review.name)}
        </span>
        <div>
          <p className="text-sm font-semibold text-slate-900">{review.name}</p>
          <p className="text-xs text-slate-500">{review.designation}</p>
        </div>
      </div>
    </div>
  );
}

export function ReviewsScroller() {
  const loop = [...REVIEWS, ...REVIEWS];

  return (
    <section className="bg-slate-50 py-20 sm:py-28">
      <div className="mx-auto max-w-2xl px-6 text-center">
        <span className="text-sm font-semibold text-[#2f6fed]">Reviews</span>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Loved by support teams</h2>
        <p className="mt-4 text-slate-600">Don't just take our word for it — here's what teams using River have to say.</p>
      </div>

      <div className="relative mt-14 overflow-hidden">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-slate-50 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-slate-50 to-transparent" />
        <div className="animate-marquee flex w-max gap-5 px-6">
          {loop.map((review, i) => (
            <ReviewCard key={`${review.name}-${i}`} review={review} />
          ))}
        </div>
      </div>
    </section>
  );
}
