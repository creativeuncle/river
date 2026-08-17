import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Menu01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { RiverLogo } from "./RiverLogo";

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "How to Use", href: "#how-to-use" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-black/5 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <a href="/" className="flex items-center gap-2 shrink-0">
          <RiverLogo className="h-7 w-auto" />
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <a href="/agent/login" className="text-sm font-medium text-slate-700 transition-colors hover:text-slate-900">
            Sign in
          </a>
          <a
            href="/agent/login"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800"
          >
            Sign up
          </a>
        </div>

        <button
          type="button"
          aria-label="Toggle menu"
          className="text-slate-700 md:hidden"
          onClick={() => setOpen((v) => !v)}
        >
          <HugeiconsIcon icon={open ? Cancel01Icon : Menu01Icon} size={22} />
        </button>
      </div>

      {open && (
        <div className="border-t border-black/5 bg-white px-6 py-4 md:hidden">
          <nav className="flex flex-col gap-4">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                {link.label}
              </a>
            ))}
            <div className="mt-2 flex flex-col gap-3 border-t border-black/5 pt-4">
              <a href="/agent/login" className="text-sm font-medium text-slate-700">
                Sign in
              </a>
              <a
                href="/agent/login"
                className="rounded-lg bg-slate-900 px-4 py-2 text-center text-sm font-semibold text-white"
              >
                Sign up
              </a>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
