"use client";

import { useEffect, useState } from "react";
import { Card, Field, GhostButton, PrimaryButton, inputCls } from "@/components/ui";
import { deletePersona, getPersonas, getProjects, savePersona, uid } from "@/lib/store";
import type { Persona, Project } from "@/lib/types";

const emptyForm = {
  name: "",
  demographics: "",
  pains: "",
  desires: "",
  objections: "",
  awarenessLevel: "problem-aware",
  tone: "",
};

export default function PersonasPage() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...emptyForm, projectId: "" });
  const [suggesting, setSuggesting] = useState(false);
  const [error, setError] = useState("");

  const refresh = () => {
    const all = getPersonas();
    setPersonas(all);
    setProjects(getProjects());
    if (!selectedId && all.length > 0) setSelectedId(all[0].id);
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(refresh, []);

  const selected = personas.find((p) => p.id === selectedId);

  const startNew = () => {
    setForm({ ...emptyForm, projectId: projects[0]?.id ?? "" });
    setEditing(true);
  };

  const startEdit = (p: Persona) => {
    setForm({
      projectId: p.projectId,
      name: p.name,
      demographics: p.demographics,
      pains: p.pains.join("\n"),
      desires: p.desires.join("\n"),
      objections: p.objections.join("\n"),
      awarenessLevel: p.awarenessLevel,
      tone: p.tone,
    });
    setSelectedId(p.id);
    setEditing(true);
  };

  const save = () => {
    const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);
    const persona: Persona = {
      id: editing && selected && form.name === selected.name ? selected.id : uid("per"),
      projectId: form.projectId,
      name: form.name.trim(),
      demographics: form.demographics.trim(),
      pains: lines(form.pains),
      desires: lines(form.desires),
      objections: lines(form.objections),
      awarenessLevel: form.awarenessLevel,
      tone: form.tone.trim(),
    };
    if (!persona.name) return;
    savePersona(persona);
    setEditing(false);
    setSelectedId(persona.id);
    refresh();
  };

  const suggest = async () => {
    const project = projects.find((p) => p.id === form.projectId) ?? projects[0];
    if (!project) {
      setError("Lege zuerst ein Projekt mit Produktbeschreibung an (Dashboard).");
      return;
    }
    setSuggesting(true);
    setError("");
    try {
      const res = await fetch("/api/persona-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName: project.name,
          productDescription: project.productDescription,
          offerType: project.offerType,
          priceTier: project.priceTier,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const s = data.persona;
      setForm({
        projectId: project.id,
        name: s.name,
        demographics: s.demographics,
        pains: s.pains.join("\n"),
        desires: s.desires.join("\n"),
        objections: s.objections.join("\n"),
        awarenessLevel: s.awarenessLevel,
        tone: s.tone,
      });
      setEditing(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Vorschlag fehlgeschlagen.");
    } finally {
      setSuggesting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-[26px] font-bold">Käufer-Profile</h1>
          <p className="text-[15px] text-muted">Dein bester Käufer als Massstab für jede Analyse.</p>
        </div>
        <div className="flex gap-2.5">
          <GhostButton onClick={suggest} disabled={suggesting}>
            {suggesting ? "KI denkt …" : "Von KI vorschlagen lassen"}
          </GhostButton>
          <PrimaryButton onClick={startNew}>+ Profil anlegen</PrimaryButton>
        </div>
      </div>
      {error && <p className="rounded-lg border border-flop/30 bg-flop/10 p-3.5 text-sm text-flop">{error}</p>}

      <div className="grid items-start gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
        {/* List */}
        <div className="flex flex-col gap-3">
          {personas.length === 0 && (
            <Card className="p-6 text-[15px] text-muted">
              Noch keine Profile. Erstelle deinen Wunschkunden — mit Pains, Wünschen und Einwänden — oder lass dir von der KI einen Vorschlag machen.
            </Card>
          )}
          {personas.map((p) => {
            const project = projects.find((x) => x.id === p.projectId);
            const active = p.id === selectedId && !editing;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setSelectedId(p.id);
                  setEditing(false);
                }}
                className={`flex items-center gap-3.5 rounded-xl border p-4 text-left ${
                  active ? "border-accent/50 bg-[#151B12]" : "border-line bg-surface hover:bg-surface2"
                }`}
              >
                <span
                  className="font-display flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-bold"
                  style={{ background: active ? "rgba(198,242,78,0.12)" : "rgba(255,255,255,0.06)", color: active ? "#C6F24E" : "#8A93A6" }}
                >
                  {p.name.slice(0, 2).toUpperCase()}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-[16px] font-semibold">{p.name}</span>
                  <span className="truncate text-[13px] text-muted">{project?.name ?? "Ohne Projekt"} · {p.awarenessLevel}</span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Detail / Editor */}
        {editing ? (
          <Card className="flex flex-col gap-4 p-6">
            <h2 className="font-display text-lg font-semibold">Profil bearbeiten</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Name des Profils">
                <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="z.B. Skincare-Sandra" />
              </Field>
              <Field label="Projekt">
                <select className={inputCls} value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}>
                  <option value="">Ohne Projekt</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Wer ist diese Person?" hint="Alter, Situation, Kaufkraft, Kaufverhalten">
              <textarea className={`${inputCls} min-h-[70px]`} value={form.demographics} onChange={(e) => setForm({ ...form, demographics: e.target.value })} />
            </Field>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Schmerzpunkte" hint="Eine pro Zeile">
                <textarea className={`${inputCls} min-h-[110px]`} value={form.pains} onChange={(e) => setForm({ ...form, pains: e.target.value })} />
              </Field>
              <Field label="Wünsche" hint="Eine pro Zeile">
                <textarea className={`${inputCls} min-h-[110px]`} value={form.desires} onChange={(e) => setForm({ ...form, desires: e.target.value })} />
              </Field>
              <Field label="Einwände" hint="Einer pro Zeile">
                <textarea className={`${inputCls} min-h-[110px]`} value={form.objections} onChange={(e) => setForm({ ...form, objections: e.target.value })} />
              </Field>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Awareness-Level">
                <select className={inputCls} value={form.awarenessLevel} onChange={(e) => setForm({ ...form, awarenessLevel: e.target.value })}>
                  <option value="unaware">Unaware — kennt das Problem nicht</option>
                  <option value="problem-aware">Problem-aware — kennt das Problem</option>
                  <option value="solution-aware">Solution-aware — kennt Lösungswege</option>
                  <option value="product-aware">Product-aware — kennt dein Produkt</option>
                </select>
              </Field>
              <Field label="Tonalität" hint="Worauf spricht diese Person an?">
                <input className={inputCls} value={form.tone} onChange={(e) => setForm({ ...form, tone: e.target.value })} placeholder="z.B. ehrlich, konkret, ohne Floskeln" />
              </Field>
            </div>
            <div className="flex gap-2.5">
              <PrimaryButton onClick={save} disabled={!form.name.trim()}>
                Profil speichern
              </PrimaryButton>
              <GhostButton onClick={() => setEditing(false)}>Abbrechen</GhostButton>
            </div>
          </Card>
        ) : selected ? (
          <Card className="flex flex-col gap-5 p-7">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-bold">{selected.name}</h2>
              <div className="flex gap-3 text-[13px]">
                <button type="button" onClick={() => startEdit(selected)} className="text-muted hover:text-ink">
                  Bearbeiten
                </button>
                <button
                  type="button"
                  onClick={() => {
                    deletePersona(selected.id);
                    setSelectedId("");
                    refresh();
                  }}
                  className="text-flop/80 hover:text-flop"
                >
                  Löschen
                </button>
              </div>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <span className="text-xs font-bold tracking-wider text-faint">WER SIE/ER IST</span>
                <p className="mt-1.5 text-sm leading-relaxed text-[#B9C1D2]">{selected.demographics}</p>
              </div>
              <div>
                <span className="text-xs font-bold tracking-wider text-faint">AWARENESS & TONALITÄT</span>
                <p className="mt-1.5 text-sm leading-relaxed text-[#B9C1D2]">
                  {selected.awarenessLevel} — {selected.tone}
                </p>
              </div>
            </div>
            {(
              [
                ["SCHMERZPUNKTE", selected.pains, "#F87171"],
                ["WÜNSCHE", selected.desires, "#4ADE80"],
                ["EINWÄNDE", selected.objections, "#FBBF24"],
              ] as [string, string[], string][]
            ).map(([label, items, color]) => (
              <div key={label}>
                <span className="text-xs font-bold tracking-wider" style={{ color }}>
                  {label}
                </span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {items.map((item) => (
                    <span key={item} className="rounded-full border border-line2 bg-white/5 px-3 py-1.5 text-[13px] text-[#B9C1D2]">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            <p className="rounded-lg border border-accent/20 bg-accent/5 p-3.5 text-[13px] leading-relaxed text-[#B9C1D2]">
              Analysen mit diesem Profil prüfen zusätzlich: Trifft die Ad die Pains/Wünsche dieser Person, und entkräftet sie mindestens einen Einwand?
            </p>
          </Card>
        ) : (
          <Card className="p-10 text-center text-[15px] text-muted">Wähle links ein Profil oder lege ein neues an.</Card>
        )}
      </div>
    </div>
  );
}
