"use client";

// One-Page-Checkout: Plan + Zahlungsrhythmus + E-Mail, ein Klick.
// MVP: aktiviert den Plan lokal und speichert den Lead; Phase 4 ersetzt
// den Kauf-Button durch Stripe Checkout.

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { Field, PrimaryButton, inputCls } from "@/components/ui";
import { PLANS, YEARLY_DISCOUNT_PCT, type Plan } from "@/lib/billing/plans";
import { saveLead, setPlan } from "@/lib/store";

function Check() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden className="shrink-0">
      <path d="M3 8.5 6.5 12 13 4.5" style={{ stroke: "var(--win)" }} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckoutInner() {
  const router = useRouter();
  const search = useSearchParams();
  const planId = (search.get("plan") ?? "standard") as Plan["id"];
  const plan = useMemo(() => PLANS.find((p) => p.id === planId && p.id !== "trial") ?? PLANS[1], [planId]);
  const [yearly, setYearly] = useState(true);
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  const monthly = yearly && plan.yearlyMonthlyChf ? plan.yearlyMonthlyChf : plan.priceChf;
  const totalToday = yearly && plan.yearlyMonthlyChf ? plan.yearlyMonthlyChf * 12 : plan.priceChf;
  const emailValid = /.+@.+\..+/.test(email);

  const buy = () => {
    saveLead({ email: email.trim(), source: "checkout", plan: `${plan.id}${yearly ? "-yearly" : ""}` });
    setPlan(plan.id as "standard" | "pro" | "agency");
    setDone(true);
  };

  if (done) {
    return (
      <div className="mx-auto flex min-h-screen max-w-[560px] flex-col items-center justify-center gap-5 px-6 text-center">
        <svg width="56" height="56" viewBox="0 0 56 56" fill="none" aria-hidden>
          <circle cx="28" cy="28" r="26" style={{ stroke: "var(--win)" }} strokeWidth="3" />
          <path d="M17 29 25 37 39 21" style={{ stroke: "var(--win)" }} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <h1 className="font-display text-[28px] font-bold">Du bist drin — {plan.name} ist aktiv</h1>
        <p className="text-[15px] leading-relaxed text-muted">
          {plan.analysesPerMonth} Analysen pro Monat sind freigeschaltet. Bestätigung geht an <strong className="text-ink">{email}</strong>.
          <br />
          <span className="text-[13px] text-faint">(Demo-Modus: Die Stripe-Zahlung wird in Phase 4 angebunden — es wurde nichts belastet.)</span>
        </p>
        <PrimaryButton onClick={() => router.push("/analyze")}>Erste Analyse starten →</PrimaryButton>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-[560px] flex-col px-6 pb-16">
      <nav className="flex items-center justify-between py-5">
        <Link href="/" className="flex items-center gap-2.5">
          <svg width="24" height="24" viewBox="0 0 26 26" fill="none" aria-hidden>
            <rect x="1" y="1" width="24" height="24" rx="7" style={{ stroke: "var(--accent-text)" }} strokeWidth="2" />
            <path d="M7 16.5 L11 9 L14.5 14 L19 7.5" style={{ stroke: "var(--accent-text)" }} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="font-display text-[17px] font-bold">Ads·Analyser</span>
        </Link>
        <span className="flex items-center gap-1.5 text-[13px] text-faint">
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden><rect x="2.5" y="6" width="9" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4" /><path d="M4.5 6V4.5a2.5 2.5 0 0 1 5 0V6" stroke="currentColor" strokeWidth="1.4" /></svg>
          Sichere Zahlung
        </span>
      </nav>

      <h1 className="font-display pb-6 pt-4 text-[26px] font-bold">{plan.name}-Plan abschliessen</h1>

      <div className="flex flex-col gap-5">
        {/* Billing toggle */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setYearly(false)}
            className={`flex flex-col gap-1 rounded-xl border p-4 text-left ${!yearly ? "border-accent/60 bg-accent-surface" : "border-line2 bg-surface"}`}
          >
            <span className="text-[14px] font-semibold">Monatlich</span>
            <span className="text-[13px] text-muted">{plan.priceChf}.–/Monat</span>
          </button>
          <button
            type="button"
            onClick={() => setYearly(true)}
            className={`relative flex flex-col gap-1 rounded-xl border p-4 text-left ${yearly ? "border-accent/60 bg-accent-surface" : "border-line2 bg-surface"}`}
          >
            <span className="absolute -top-2.5 right-3 rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-bold text-accent-ink">−{YEARLY_DISCOUNT_PCT} %</span>
            <span className="text-[14px] font-semibold">Jährlich</span>
            <span className="text-[13px] text-muted">{plan.yearlyMonthlyChf}.–/Monat</span>
          </button>
        </div>

        {/* Order summary */}
        <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-5">
          <div className="flex justify-between text-[14px]"><span className="text-muted">{plan.name} · {yearly ? "jährlich" : "monatlich"}</span><span className="font-medium">{monthly}.–/Monat</span></div>
          <div className="flex justify-between text-[14px]"><span className="text-muted">{plan.analysesPerMonth} Analysen/Monat</span><span className="font-medium">{plan.perAnalysisChf?.toFixed(2)}/Analyse</span></div>
          <div className="border-t border-line pt-3">
            <div className="flex justify-between">
              <span className="text-[15px] font-semibold">Heute fällig</span>
              <span className="font-display text-[20px] font-bold">CHF {totalToday}.–</span>
            </div>
            {yearly && <span className="text-[12px] text-faint">12 × {monthly}.– · du sparst {(plan.priceChf - (plan.yearlyMonthlyChf ?? 0)) * 12}.–/Jahr</span>}
          </div>
        </div>

        <Field label="E-Mail" hint="Für Zugang und Rechnung.">
          <input
            className={inputCls}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="du@firma.ch"
            autoFocus
          />
        </Field>

        <PrimaryButton onClick={buy} disabled={!emailValid}>
          Jetzt {plan.name} aktivieren — CHF {totalToday}.–
        </PrimaryButton>

        <div className="flex flex-col gap-2 pt-1">
          {["Monatlich kündbar, keine Mindestlaufzeit", "14 Tage Geld-zurück, ohne Fragen", "Zahlung über Stripe · Preise in CHF inkl. MwSt."].map((t) => (
            <span key={t} className="flex items-center gap-2.5 text-[13px] text-muted"><Check />{t}</span>
          ))}
        </div>

        <p className="text-center text-[13px] text-faint">
          Anderer Plan? <Link href="/checkout?plan=standard" className="text-accent-text">Standard</Link> ·{" "}
          <Link href="/checkout?plan=pro" className="text-accent-text">Pro</Link> ·{" "}
          <Link href="/checkout?plan=agency" className="text-accent-text">Agency</Link>
        </p>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense>
      <CheckoutInner />
    </Suspense>
  );
}
