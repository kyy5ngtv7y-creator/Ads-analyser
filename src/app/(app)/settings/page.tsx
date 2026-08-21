"use client";

import { useEffect, useState } from "react";
import { Card, PrimaryButton } from "@/components/ui";
import { PLANS, TRIAL_DAYS } from "@/lib/billing/plans";
import { getUsage, setPlan, trialState, type Usage } from "@/lib/store";

export default function SettingsPage() {
  const [usage, setUsage] = useState<Usage | null>(null);
  useEffect(() => setUsage(getUsage()), []);
  if (!usage) return <div className="p-10 text-muted">Lade …</div>;

  const state = trialState(usage);
  const current = PLANS.find((p) => p.id === usage.plan)!;

  return (
    <div className="flex max-w-[900px] flex-col gap-6 p-6 lg:p-10">
      <div>
        <h1 className="font-display text-[26px] font-bold">Abo &amp; Einstellungen</h1>
        <p className="text-[15px] text-muted">Dein Plan, dein Verbrauch — Preise in CHF.</p>
      </div>

      <Card className="flex flex-col gap-3 p-6">
        <div className="flex items-center justify-between">
          <span className="font-display text-lg font-semibold">Aktueller Plan: {current.name}</span>
          <span className="text-sm text-muted">
            {usage.analysesUsed} / {current.analysesPerMonth} Analysen genutzt
          </span>
        </div>
        <div className="h-2 rounded-full bg-surface2">
          <div
            className="h-2 rounded-full bg-accent"
            style={{ width: `${Math.min(100, (usage.analysesUsed / current.analysesPerMonth) * 100)}%` }}
          />
        </div>
        {usage.plan === "trial" && (
          <p className="text-sm text-muted">
            {state.daysLeft > 0
              ? `Trial: noch ${state.daysLeft} von ${TRIAL_DAYS} Tagen.`
              : "Dein Trial ist abgelaufen — wähle unten einen Plan."}
          </p>
        )}
      </Card>

      <div className="grid gap-5 md:grid-cols-2">
        {PLANS.filter((p) => p.id !== "trial").map((plan) => {
          const isCurrent = usage.plan === plan.id;
          const highlight = plan.id === "pro";
          return (
            <Card key={plan.id} className={`flex flex-col gap-4 p-6 ${highlight ? "border-accent/50" : ""}`}>
              <div className="flex items-baseline justify-between">
                <span className={`text-sm font-bold tracking-wide ${highlight ? "text-accent-text" : "text-muted"}`}>
                  {plan.name.toUpperCase()}
                </span>
                <span className="font-display text-3xl font-bold">
                  {plan.priceChf}.–<span className="text-sm font-normal text-muted">/Monat</span>
                </span>
              </div>
              <ul className="flex flex-col gap-2 text-sm text-soft">
                {plan.features.map((f) => (
                  <li key={f}>· {f}</li>
                ))}
                <li>
                  · <strong>{plan.perAnalysisChf?.toFixed(2)} pro Analyse</strong>
                </li>
              </ul>
              {isCurrent ? (
                <span className="mt-auto rounded-lg border border-line2 py-2.5 text-center text-sm font-semibold text-muted">Aktiv</span>
              ) : (
                <PrimaryButton
                  onClick={() => {
                    setUsage(setPlan(plan.id as "standard" | "pro"));
                  }}
                >
                  {plan.name} wählen
                </PrimaryButton>
              )}
            </Card>
          );
        })}
      </div>

      <Card className="flex flex-col gap-2 p-6 text-sm leading-relaxed text-muted">
        <span className="font-display text-[15px] font-semibold text-ink">Hinweis zum MVP-Stand</span>
        <p>
          Planwechsel wird aktuell lokal gespeichert (kein echter Checkout). Phase 4 bindet Stripe an: Abos Standard/Pro, Monatslimits
          serverseitig, Rechnungen im Kundenportal. Analysen, Projekte und Profile liegen aktuell in deinem Browser (localStorage);
          Phase 2 bringt Accounts mit Supabase. Details in der README.
        </p>
      </Card>
    </div>
  );
}
