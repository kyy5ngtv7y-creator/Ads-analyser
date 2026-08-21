"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, Chip, Field, PrimaryButton, inputCls, tint } from "@/components/ui";
import { getAngleSets, getPersonas, getProjects, saveAngleSet, uid, type StoredAngleSet } from "@/lib/store";
import type { AngleSuggestion, CampaignGoal, FunnelStage, Persona, Project } from "@/lib/types";

const FIT_COLOR = { strong: "var(--win)", ok: "var(--warn)", weak: "var(--flop)" } as const;
const FIT_LABEL = { strong: "stark", ok: "ok", weak: "schwach" } as const;
// Roh-Hexwerte werden mit var(--tone) gemischt: auf Dunkel aufgehellt, auf Hell abgedunkelt.
const mixTone = (hex: string) => `color-mix(in srgb, ${hex} 68%, var(--tone) 32%)`;
const TYPE_COLORS: Record<string, string> = {
  pain_point: "var(--flop)",
  desire: mixTone("#22D3EE"),
  social_proof: "var(--win)",
  us_vs_them: "var(--warn)",
  mechanism: "var(--solid)",
  fomo: mixTone("#FB923C"),
  price_value: mixTone("#A78BFA"),
  identity: mixTone("#F472B6"),
};

export default function AnglesPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [projectId, setProjectId] = useState("");
  const [personaId, setPersonaId] = useState("");
  const [goal, setGoal] = useState<CampaignGoal>("sales");
  const [funnelStage, setFunnelStage] = useState<FunnelStage>("cold");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [currentSet, setCurrentSet] = useState<StoredAngleSet | null>(null);

  useEffect(() => {
    const p = getProjects();
    setProjects(p);
    setPersonas(getPersonas());
    if (p.length > 0) setProjectId(p[0].id);
    const sets = getAngleSets();
    if (sets.length > 0) setCurrentSet(sets[0]);
  }, []);

  const project = projects.find((p) => p.id === projectId);
  const projectPersonas = personas.filter((p) => !projectId || p.projectId === projectId || !p.projectId);
  const persona = projectPersonas.find((p) => p.id === personaId) ?? null;

  const generate = async () => {
    if (!project) {
      setError("Lege zuerst ein Projekt mit Produktbeschreibung an (Dashboard).");
      return;
    }
    setRunning(true);
    setError("");
    try {
      const res = await fetch("/api/angles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName: project.name,
          productDescription: project.productDescription,
          offerType: project.offerType,
          priceTier: project.priceTier,
          goal,
          funnelStage,
          persona,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const set: StoredAngleSet = {
        id: uid("ang"),
        projectId: project.id,
        createdAt: new Date().toISOString(),
        context: {
          projectName: project.name,
          goal: { sales: "Verkaufen", leads: "Leads", brand: "Marke aufbauen" }[goal],
          funnelStage: { cold: "Cold", retargeting: "Retargeting", customers: "Bestandskunden" }[funnelStage],
          personaName: persona?.name,
        },
        angles: data.angles as AngleSuggestion[],
      };
      saveAngleSet(set);
      setCurrentSet(set);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generierung fehlgeschlagen.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-10">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-display text-[26px] font-bold">Angle-Finder</h1>
        <p className="text-[15px] text-muted">
          Marketing-Angles für dein Produkt, dein Ziel und deinen Wunschkunden — bevor du die Ad baust.
        </p>
      </div>

      {/* Context bar */}
      <Card className="flex flex-col gap-4 p-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Projekt / Produkt">
            <select className={inputCls} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              {projects.length === 0 && <option value="">Kein Projekt vorhanden</option>}
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Kampagnenziel">
            <div className="flex gap-2">
              {(
                [
                  ["sales", "Verkaufen"],
                  ["leads", "Leads"],
                  ["brand", "Marke"],
                ] as [CampaignGoal, string][]
              ).map(([value, label]) => (
                <Chip key={value} active={goal === value} onClick={() => setGoal(value)}>
                  {label}
                </Chip>
              ))}
            </div>
          </Field>
          <Field label="Funnel-Stufe">
            <div className="flex gap-2">
              {(
                [
                  ["cold", "Cold"],
                  ["retargeting", "Retargeting"],
                  ["customers", "Kunden"],
                ] as [FunnelStage, string][]
              ).map(([value, label]) => (
                <Chip key={value} active={funnelStage === value} onClick={() => setFunnelStage(value)}>
                  {label}
                </Chip>
              ))}
            </div>
          </Field>
          <Field label="Käufer-Profil">
            <select className={inputCls} value={personaId} onChange={(e) => setPersonaId(e.target.value)}>
              <option value="">Ohne Profil</option>
              {projectPersonas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="flex items-center gap-4">
          <PrimaryButton onClick={generate} disabled={running || !project}>
            {running ? "Generiere Angles …" : "Angles generieren"}
          </PrimaryButton>
          {!project && (
            <span className="text-sm text-muted">
              Zuerst im <Link href="/dashboard" className="text-accent-text">Dashboard</Link> ein Projekt anlegen.
            </span>
          )}
        </div>
        {error && <p className="text-sm text-flop">{error}</p>}
      </Card>

      {/* Angle cards */}
      {currentSet && (
        <div className="flex flex-col gap-4">
          <span className="text-sm text-muted">
            {currentSet.context.projectName} · {currentSet.context.goal} · {currentSet.context.funnelStage}
            {currentSet.context.personaName ? ` · ${currentSet.context.personaName}` : ""} ·{" "}
            {new Date(currentSet.createdAt).toLocaleString("de-CH")}
          </span>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {currentSet.angles.map((angle, i) => {
              const color = TYPE_COLORS[angle.type] ?? "var(--solid)";
              return (
                <Card key={i} className="flex flex-col gap-3.5 p-5">
                  <span
                    className="w-fit rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wider"
                    style={{ background: tint(color), color }}
                  >
                    {angle.typeLabel.toUpperCase()}
                  </span>
                  <h3 className="font-display text-[17px] font-semibold leading-snug">{angle.title}</h3>
                  <p className="text-[13.5px] leading-relaxed text-muted">{angle.coreMessage}</p>
                  <div className="flex flex-col gap-2">
                    {angle.hooks.slice(0, 2).map((hook) => (
                      <p key={hook} className="border-l-2 border-line2 pl-3.5 text-[13.5px] leading-relaxed text-soft">
                        {hook}
                      </p>
                    ))}
                  </div>
                  <p className="text-[13px] leading-relaxed text-faint">
                    <strong className="text-muted">Creative:</strong> {angle.creativeIdea}
                  </p>
                  <p className="text-[13px] text-faint">
                    <strong className="text-muted">Struktur:</strong> {angle.copyStructure}
                  </p>
                  <div className="flex flex-wrap gap-3 text-[11px] text-faint">
                    {(
                      [
                        ["cold", "Cold"],
                        ["retargeting", "Retargeting"],
                        ["customers", "Kunden"],
                      ] as [FunnelStage, string][]
                    ).map(([stage, label]) => (
                      <span key={stage} className="flex items-center gap-1.5">
                        <i className="h-1.5 w-1.5 rounded-full" style={{ background: FIT_COLOR[angle.funnelFit[stage]] }} />
                        {label}: {FIT_LABEL[angle.funnelFit[stage]]}
                      </span>
                    ))}
                  </div>
                  <Link
                    href={`/analyze?angleSet=${currentSet.id}&angle=${i}`}
                    className="mt-auto rounded-lg border border-accent/40 py-2.5 text-center text-[13px] font-semibold text-accent-text hover:bg-accent/10"
                  >
                    Ad zu diesem Angle bauen →
                  </Link>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
