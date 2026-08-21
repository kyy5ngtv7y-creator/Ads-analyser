"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, VerdictBadge, PrimaryButton, inputCls, Field } from "@/components/ui";
import {
  getAnalyses,
  getPersonas,
  getProjects,
  getUsage,
  saveProject,
  trialState,
  uid,
  type StoredAnalysis,
  type Usage,
} from "@/lib/store";
import { PLANS } from "@/lib/billing/plans";
import type { OfferType, PriceTier, Project } from "@/lib/types";

const OFFER_LABEL: Record<OfferType, string> = { service: "Service", product: "Eigenes Produkt", dropshipping: "Dropshipping" };
const PLATFORM_LABEL: Record<string, string> = { meta: "Meta", tiktok: "TikTok" };

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [analyses, setAnalyses] = useState<StoredAnalysis[]>([]);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [showNewProject, setShowNewProject] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [offerType, setOfferType] = useState<OfferType>("product");
  const [priceTier, setPriceTier] = useState<PriceTier>("mid");

  const refresh = () => {
    setProjects(getProjects());
    setAnalyses(getAnalyses());
    setUsage(getUsage());
  };
  useEffect(refresh, []);

  const state = usage ? trialState(usage) : null;
  const plan = usage ? PLANS.find((p) => p.id === usage.plan) : null;
  const avgScore =
    analyses.length > 0
      ? Math.round(analyses.reduce((acc, a) => acc + Math.max(...a.results.map((r) => r.totalScore)), 0) / analyses.length)
      : null;
  const winners = analyses.filter((a) => a.results.some((r) => r.totalScore >= 75)).length;

  const createProject = () => {
    if (!name.trim() || !description.trim()) return;
    saveProject({
      id: uid("prj"),
      name: name.trim(),
      productDescription: description.trim(),
      offerType,
      priceTier,
      createdAt: new Date().toISOString(),
    });
    setName("");
    setDescription("");
    setShowNewProject(false);
    refresh();
  };

  return (
    <div className="flex flex-col gap-7 p-6 lg:p-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-[26px] font-bold">Dashboard</h1>
          <p className="text-[15px] text-muted">Hier ist der Stand deiner Ads.</p>
        </div>
        <Link href="/analyze" className="rounded-lg bg-accent px-5 py-3 text-[15px] font-semibold text-accent-ink hover:opacity-90">
          + Neue Analyse
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="flex flex-col gap-1 p-5">
          <span className="text-[13px] font-medium text-muted">Analysen übrig</span>
          <span className="font-display text-3xl font-bold">{state ? state.analysesLeft : "–"}</span>
          <span className="text-[13px] text-faint">
            {plan ? `von ${plan.analysesPerMonth} (${plan.name})` : ""}
          </span>
        </Card>
        <Card className="flex flex-col gap-1 p-5">
          <span className="text-[13px] font-medium text-muted">Ø Winner-Score</span>
          <span className="font-display text-3xl font-bold" style={{ color: avgScore !== null && avgScore >= 55 ? "var(--solid)" : undefined }}>
            {avgScore !== null ? `${avgScore}%` : "–"}
          </span>
          <span className="text-[13px] text-faint">{analyses.length > 0 ? "über alle Analysen" : "noch keine Analysen"}</span>
        </Card>
        <Card className="flex flex-col gap-1 p-5">
          <span className="text-[13px] font-medium text-muted">Analysen gesamt</span>
          <span className="font-display text-3xl font-bold">{analyses.length}</span>
          <span className="text-[13px] text-faint">{usage?.plan === "trial" && state ? (state.daysLeft > 0 ? `Trial: noch ${state.daysLeft} Tage` : "Trial abgelaufen") : ""}</span>
        </Card>
        <Card className="flex flex-col gap-1 p-5">
          <span className="text-[13px] font-medium text-muted">Winner-Quote</span>
          <span className="font-display text-3xl font-bold">
            {analyses.length > 0 ? `${Math.round((winners / analyses.length) * 100)}%` : "–"}
          </span>
          <span className="text-[13px] text-faint">{analyses.length > 0 ? `${winners} von ${analyses.length} mit Score ≥ 75` : ""}</span>
        </Card>
      </div>

      {/* Projects */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Projekte</h2>
          <button type="button" onClick={() => setShowNewProject((v) => !v)} className="text-sm font-medium text-accent-text hover:opacity-80">
            + Projekt anlegen
          </button>
        </div>

        {showNewProject && (
          <Card className="flex flex-col gap-4 p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Name (Brand/Kunde)">
                <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="z.B. Lumea Skincare" />
              </Field>
              <Field label="Angebots-Typ & Preisklasse">
                <div className="flex gap-2">
                  <select className={inputCls} value={offerType} onChange={(e) => setOfferType(e.target.value as OfferType)}>
                    <option value="product">Eigenes Produkt</option>
                    <option value="service">Service / Dienstleistung</option>
                    <option value="dropshipping">Dropshipping</option>
                  </select>
                  <select className={inputCls} value={priceTier} onChange={(e) => setPriceTier(e.target.value as PriceTier)}>
                    <option value="budget">günstig</option>
                    <option value="mid">mittel</option>
                    <option value="premium">premium</option>
                  </select>
                </div>
              </Field>
            </div>
            <Field label="Produkt / Angebot" hint="Je konkreter, desto besser die Analyse: Was ist es, für wen, was kostet es?">
              <textarea
                className={`${inputCls} min-h-[80px]`}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="z.B. Bakuchiol-Serum für sensible Haut, CHF 89, wirkt wie Retinol ohne Reizung …"
              />
            </Field>
            <div>
              <PrimaryButton onClick={createProject} disabled={!name.trim() || !description.trim()}>
                Projekt speichern
              </PrimaryButton>
            </div>
          </Card>
        )}

        {projects.length === 0 && !showNewProject ? (
          <Card className="flex flex-col items-center gap-3 p-10 text-center">
            <p className="text-[15px] text-muted">Noch keine Projekte. Lege dein erstes Projekt an — es speichert Produkt-Kontext und Käufer-Profile für alle Analysen.</p>
            <PrimaryButton onClick={() => setShowNewProject(true)}>Erstes Projekt anlegen</PrimaryButton>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => {
              const projectAnalyses = analyses.filter((a) => a.projectId === p.id);
              const best = projectAnalyses.length > 0 ? Math.max(...projectAnalyses.flatMap((a) => a.results.map((r) => r.totalScore))) : null;
              const personaCount = getPersonas(p.id).length;
              return (
                <Card key={p.id} className="flex flex-col gap-2.5 p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-[16px] font-semibold">{p.name}</span>
                    <span className="rounded-full border border-line2 px-2.5 py-0.5 text-xs text-muted">{OFFER_LABEL[p.offerType]}</span>
                  </div>
                  <span className="text-[13px] text-muted">
                    {projectAnalyses.length} Analysen · {personaCount} Käufer-Profile
                  </span>
                  {best !== null && (
                    <span className="text-[13px] font-semibold" style={{ color: best >= 75 ? "var(--win)" : best >= 55 ? "var(--solid)" : "var(--warn)" }}>
                      Bester Score: {best}%
                    </span>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent analyses */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Letzte Analysen</h2>
          <Link href="/history" className="text-sm text-muted hover:text-ink">
            Alle ansehen
          </Link>
        </div>
        {analyses.length === 0 ? (
          <Card className="p-10 text-center text-[15px] text-muted">
            Noch keine Analysen. <Link href="/analyze" className="text-accent-text">Starte deine erste Analyse</Link> — die ersten 3 sind gratis.
          </Card>
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead>
                <tr className="text-xs font-semibold uppercase tracking-wider text-faint">
                  <th className="px-4 py-3">Ad</th>
                  <th className="px-4 py-3">Plattform</th>
                  <th className="px-4 py-3">Funnel</th>
                  <th className="px-4 py-3">Ziel-Event</th>
                  <th className="px-4 py-3 text-right">Score</th>
                </tr>
              </thead>
              <tbody>
                {analyses.slice(0, 6).map((a) => {
                  const best = a.results.reduce((acc, r) => (r.totalScore > acc.totalScore ? r : acc), a.results[0]);
                  return (
                    <tr key={a.id} className="border-t border-line text-sm hover:bg-surface2/50">
                      <td className="px-4 py-3.5">
                        <Link href={`/analysis/${a.id}`} className="font-medium hover:text-accent-text">
                          {a.input.projectName || "Ad"} · {new Date(a.createdAt).toLocaleDateString("de-CH")}
                        </Link>
                      </td>
                      <td className="px-4 py-3.5 text-muted">{a.input.platforms.map((p) => PLATFORM_LABEL[p]).join(" + ")}</td>
                      <td className="px-4 py-3.5 text-muted">
                        {a.input.funnelStage === "cold" ? "Cold" : a.input.funnelStage === "retargeting" ? "Retargeting" : "Bestandskunden"}
                      </td>
                      <td className="px-4 py-3.5 text-muted">
                        {{ impressions: "Impressionen", sales: "Sales", add_to_cart: "Add-to-Cart", checkout: "Checkout", awareness: "Bekanntheit" }[a.input.primaryMetric]}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <VerdictBadge verdict={best.verdict} score={best.totalScore} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  );
}
