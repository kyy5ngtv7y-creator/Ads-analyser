"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getUsage, trialState, type Usage } from "@/lib/store";
import { PLANS } from "@/lib/billing/plans";

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 px-3.5 pb-5 pt-1.5">
      <svg width="24" height="24" viewBox="0 0 26 26" fill="none" aria-hidden>
        <rect x="1" y="1" width="24" height="24" rx="7" stroke="#C6F24E" strokeWidth="2" />
        <path d="M7 16.5 L11 9 L14.5 14 L19 7.5" stroke="#C6F24E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="font-display text-[17px] font-bold">Ads·Analyser</span>
    </Link>
  );
}

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/analyze", label: "Neue Analyse" },
  { href: "/angles", label: "Angle-Finder" },
  { href: "/personas", label: "Käufer-Profile" },
  { href: "/history", label: "Historie" },
  { href: "/compare", label: "A/B-Vergleich" },
  { href: "/settings", label: "Abo & Einstellungen" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [usage, setUsage] = useState<Usage | null>(null);

  useEffect(() => {
    setUsage(getUsage());
  }, [pathname]);

  const state = usage ? trialState(usage) : null;
  const plan = usage ? PLANS.find((p) => p.id === usage.plan) : null;

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-[232px] shrink-0 flex-col gap-1 border-r border-line px-3.5 py-5 md:flex">
        <Logo />
        {NAV.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3.5 py-2.5 text-[15px] font-medium transition-colors ${
                active ? "bg-accent/10 text-ink" : "text-muted hover:text-ink"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
        {usage && state && plan && (
          <div className="mt-auto rounded-xl border border-line bg-surface p-3.5 text-[13px]">
            <div className="flex justify-between">
              <span className="text-muted">Analysen</span>
              <span className="font-semibold">
                {usage.analysesUsed} / {plan.analysesPerMonth}
              </span>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-surface2">
              <div
                className="h-1.5 rounded-full bg-accent"
                style={{ width: `${Math.min(100, (usage.analysesUsed / plan.analysesPerMonth) * 100)}%` }}
              />
            </div>
            <div className="mt-2 text-[12px] text-faint">
              {usage.plan === "trial"
                ? state.daysLeft > 0
                  ? `Trial · noch ${state.daysLeft} Tag${state.daysLeft === 1 ? "" : "e"}`
                  : "Trial abgelaufen"
                : plan.name}
            </div>
          </div>
        )}
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
