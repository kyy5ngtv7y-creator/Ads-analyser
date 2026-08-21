"use client";

import { PLANS } from "@/lib/billing/plans";
import { setPlan } from "@/lib/store";

// MVP-Paywall: Planwahl wird lokal gespeichert; Phase 4 ersetzt die Buttons
// durch Stripe-Checkout (siehe README).
export default function PaywallModal({ onUpgraded, reason }: { onUpgraded: () => void; reason: string }) {
  const paid = PLANS.filter((p) => p.id !== "trial");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-[760px] rounded-2xl border border-line2 bg-[#0E1219] p-8 shadow-[0_40px_120px_rgba(0,0,0,0.7)]">
        <div className="flex flex-col items-center gap-2.5 text-center">
          <svg width="40" height="40" viewBox="0 0 22 22" fill="none" aria-hidden>
            <rect x="4" y="9" width="14" height="9" rx="2" stroke="#C6F24E" strokeWidth="1.8" />
            <path d="M7 9V6.5a4 4 0 0 1 8 0V9" stroke="#C6F24E" strokeWidth="1.8" />
            <circle cx="11" cy="13.5" r="1.4" fill="#C6F24E" />
          </svg>
          <h2 className="font-display text-2xl font-bold">{reason}</h2>
          <p className="max-w-[520px] text-[15px] leading-relaxed text-muted">
            Du hast gesehen, wie das Tool bewertet. Wähle jetzt deinen Plan — je mehr du testest, desto günstiger wird jede Analyse.
          </p>
        </div>
        <div className="mt-7 grid gap-5 md:grid-cols-2">
          {paid.map((plan) => {
            const highlight = plan.id === "pro";
            return (
              <div
                key={plan.id}
                className={`relative flex flex-col gap-4 rounded-xl border p-6 ${
                  highlight ? "border-accent/60 bg-[#151B12]" : "border-line2 bg-surface"
                }`}
              >
                {highlight && (
                  <span className="absolute -top-3 right-5 rounded-full bg-accent px-3 py-1 text-[11px] font-bold text-accent-ink">
                    4× GÜNSTIGER PRO ANALYSE
                  </span>
                )}
                <span className={`text-[13px] font-bold tracking-wide ${highlight ? "text-accent" : "text-muted"}`}>
                  {plan.name.toUpperCase()}
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-4xl font-bold">{plan.priceChf}.–</span>
                  <span className="text-[15px] text-muted">/Monat</span>
                </div>
                <div
                  className={`flex items-center justify-between rounded-lg border px-3.5 py-2.5 text-sm ${
                    highlight ? "border-accent/35 bg-accent/5 text-[#B9C1D2]" : "border-line2 text-muted"
                  }`}
                >
                  <span>Preis pro Analyse</span>
                  <span className={`font-display text-[17px] font-bold ${highlight ? "text-accent" : "text-ink"}`}>
                    {plan.perAnalysisChf?.toFixed(2)}
                  </span>
                </div>
                <ul className="flex flex-col gap-2 text-sm text-[#B9C1D2]">
                  {plan.features.map((f) => (
                    <li key={f}>· {f}</li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => {
                    setPlan(plan.id as "standard" | "pro");
                    onUpgraded();
                  }}
                  className={`mt-auto rounded-lg py-3 text-[15px] font-semibold ${
                    highlight ? "bg-accent text-accent-ink hover:opacity-90" : "border border-line2 text-ink hover:bg-surface2"
                  }`}
                >
                  {plan.name} wählen
                </button>
              </div>
            );
          })}
        </div>
        <p className="mt-5 text-center text-[13px] text-faint">
          Monatlich kündbar · Preise in CHF inkl. MwSt. · Demo-Modus: Zahlung via Stripe folgt in Phase 4
        </p>
      </div>
    </div>
  );
}
