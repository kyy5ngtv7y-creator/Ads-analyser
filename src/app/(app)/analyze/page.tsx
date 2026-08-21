"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import PaywallModal from "@/components/PaywallModal";
import { Card, Chip, Field, GhostButton, OptionCard, PrimaryButton, inputCls } from "@/components/ui";
import {
  getAngleSets,
  getPersonas,
  getProjects,
  getUsage,
  recordAnalysisUse,
  saveAnalysis,
  trialState,
} from "@/lib/store";
import type {
  AdFormat,
  AdInput,
  AnalysisResult,
  CampaignGoal,
  FunnelStage,
  OfferType,
  Persona,
  Platform,
  PriceTier,
  PrimaryMetric,
  Project,
} from "@/lib/types";
import { extractVideoFrames, fileToBase64Image, type ExtractedFrame } from "@/lib/video";

const STEPS = [
  "Projekt & Plattform",
  "Angebots-Typ & Preisklasse",
  "Ziel & wichtigste Metrik",
  "Funnel-Stufe",
  "Käufer-Profil",
  "Creative hochladen",
  "Copy eingeben",
  "Analyse starten",
];

type Frame = ExtractedFrame | { data: string; mediaType: "image/jpeg" | "image/png" | "image/webp"; label: string };

function AnalyzeWizard() {
  const router = useRouter();
  const search = useSearchParams();
  const [step, setStep] = useState(0);
  const [projects, setProjects] = useState<Project[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallReason, setPaywallReason] = useState("");

  // Schritt 1
  const [projectId, setProjectId] = useState<string>("");
  const [projectName, setProjectName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [platforms, setPlatforms] = useState<Platform[]>(["meta"]);
  // Schritt 2
  const [offerType, setOfferType] = useState<OfferType>("product");
  const [priceTier, setPriceTier] = useState<PriceTier>("mid");
  // Schritt 3
  const [goal, setGoal] = useState<CampaignGoal>("sales");
  const [metric, setMetric] = useState<PrimaryMetric>("sales");
  // Schritt 4
  const [funnelStage, setFunnelStage] = useState<FunnelStage>("cold");
  // Schritt 5
  const [personaId, setPersonaId] = useState<string>("");
  // Schritt 6
  const [format, setFormat] = useState<AdFormat>("image");
  const [frames, setFrames] = useState<Frame[]>([]);
  const [videoDuration, setVideoDuration] = useState<number | undefined>();
  const [uploadError, setUploadError] = useState("");
  const [uploading, setUploading] = useState(false);
  // Schritt 7
  const [headline, setHeadline] = useState("");
  const [primaryText, setPrimaryText] = useState("");
  const [cta, setCta] = useState("");
  // Schritt 8
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setProjects(getProjects());
    setPersonas(getPersonas());
    // Angle-Vorlage übernehmen (aus dem Angle-Finder)
    const angleSetId = search.get("angleSet");
    const angleIdx = search.get("angle");
    if (angleSetId && angleIdx) {
      const set = getAngleSets().find((s) => s.id === angleSetId);
      const angle = set?.angles[Number(angleIdx)];
      if (angle) {
        setHeadline(angle.hooks[0] ?? "");
        setPrimaryText(`${angle.coreMessage}\n\n(Angle: ${angle.typeLabel} — Struktur: ${angle.copyStructure})`);
      }
    }
  }, [search]);

  const selectedProject = projects.find((p) => p.id === projectId);
  useEffect(() => {
    if (selectedProject) {
      setProjectName(selectedProject.name);
      setProductDescription(selectedProject.productDescription);
      setOfferType(selectedProject.offerType);
      setPriceTier(selectedProject.priceTier);
    }
  }, [selectedProject]);

  const projectPersonas = useMemo(
    () => (projectId ? personas.filter((p) => p.projectId === projectId || !p.projectId) : personas),
    [personas, projectId]
  );
  const persona = projectPersonas.find((p) => p.id === personaId) ?? null;

  const togglePlatform = (p: Platform) => {
    setPlatforms((prev) => (prev.includes(p) ? (prev.length > 1 ? prev.filter((x) => x !== p) : prev) : [...prev, p]));
  };

  const handleFile = async (file: File) => {
    setUploadError("");
    setUploading(true);
    try {
      if (file.type.startsWith("video/")) {
        setFormat("video");
        const { frames: vf, durationSec } = await extractVideoFrames(file);
        setFrames(vf);
        setVideoDuration(durationSec);
      } else {
        setFormat("image");
        const img = await fileToBase64Image(file);
        setFrames([{ ...img, label: "Creative" }]);
        setVideoDuration(undefined);
      }
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload fehlgeschlagen.");
      setFrames([]);
    } finally {
      setUploading(false);
    }
  };

  const canNext = (): boolean => {
    switch (step) {
      case 0:
        return (Boolean(projectId) || (projectName.trim().length > 0 && productDescription.trim().length > 0)) && platforms.length > 0;
      case 6:
        return primaryText.trim().length > 0 || headline.trim().length > 0;
      default:
        return true;
    }
  };

  const startAnalysis = async () => {
    const usage = getUsage();
    const state = trialState(usage);
    if (state.blocked) {
      setPaywallReason(
        usage.plan === "trial"
          ? state.analysesLeft <= 0
            ? "Deine 3 Gratis-Analysen sind aufgebraucht"
            : "Dein 3-Tage-Trial ist abgelaufen"
          : "Dein Monats-Kontingent ist aufgebraucht"
      );
      setShowPaywall(true);
      return;
    }

    setRunning(true);
    setError("");
    const input: AdInput = {
      projectName: projectName.trim() || "Mein Angebot",
      productDescription: productDescription.trim(),
      offerType,
      priceTier,
      platforms,
      format,
      goal,
      primaryMetric: metric,
      funnelStage,
      copy: { headline: headline.trim(), primaryText: primaryText.trim(), cta: cta.trim() },
      persona,
      creativeFrames: frames,
      videoDurationSec: videoDuration,
    };
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analyse fehlgeschlagen.");
      const result = data as AnalysisResult;
      saveAnalysis({ ...result, projectId: projectId || undefined });
      recordAnalysisUse();
      router.push(`/analysis/${result.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analyse fehlgeschlagen.");
      setRunning(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {showPaywall && <PaywallModal reason={paywallReason} onUpgraded={() => setShowPaywall(false)} />}

      {/* Step rail */}
      <aside className="sticky top-0 hidden h-screen w-[280px] shrink-0 flex-col gap-6 border-r border-line p-7 lg:flex">
        <span className="font-display text-[16px] font-bold">Neue Analyse</span>
        <ol className="flex flex-col gap-4">
          {STEPS.map((label, i) => (
            <li key={label} className={`flex items-center gap-3 text-sm ${i === step ? "font-semibold text-ink" : i < step ? "text-muted" : "text-faint"}`}>
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                  i === step
                    ? "border-accent bg-accent text-accent-ink"
                    : i < step
                      ? "border-accent/50 bg-accent/10 text-accent"
                      : "border-line2"
                }`}
              >
                {i < step ? "✓" : i + 1}
              </span>
              {label}
            </li>
          ))}
        </ol>
        {(projectName || selectedProject) && (
          <div className="mt-auto rounded-xl border border-line bg-surface p-3.5 text-[13px] leading-relaxed text-muted">
            <strong className="text-ink">{projectName || selectedProject?.name}</strong>
            <br />
            {platforms.map((p) => (p === "meta" ? "Meta" : "TikTok")).join(" + ")} ·{" "}
            {{ product: "Eigenes Produkt", service: "Service", dropshipping: "Dropshipping" }[offerType]} ·{" "}
            {{ budget: "günstig", mid: "mittel", premium: "Premium" }[priceTier]}
          </div>
        )}
      </aside>

      {/* Step content */}
      <div className="flex min-w-0 flex-1 flex-col gap-8 p-6 lg:p-12">
        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-semibold tracking-wide text-accent">
            SCHRITT {step + 1} VON {STEPS.length}
          </span>
          <h1 className="font-display text-[28px] font-bold">{STEPS[step]}</h1>
        </div>

        {step === 0 && (
          <div className="flex max-w-[720px] flex-col gap-6">
            {projects.length > 0 && (
              <Field label="Projekt wählen (oder unten neu eingeben)">
                <select className={inputCls} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                  <option value="">— Ohne Projekt / neu —</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            {!projectId && (
              <>
                <Field label="Brand / Angebot">
                  <input className={inputCls} value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="z.B. Lumea Skincare" />
                </Field>
                <Field label="Was bewirbst du?" hint="Je konkreter, desto besser die Analyse: Was ist es, für wen, was kostet es?">
                  <textarea
                    className={`${inputCls} min-h-[90px]`}
                    value={productDescription}
                    onChange={(e) => setProductDescription(e.target.value)}
                    placeholder="z.B. Bakuchiol-Serum für sensible Haut, CHF 89 …"
                  />
                </Field>
              </>
            )}
            <Field label="Plattform(en)" hint="Beide gewählt = zwei Scores nebeneinander plus Vergleich.">
              <div className="flex gap-2.5">
                <Chip active={platforms.includes("meta")} onClick={() => togglePlatform("meta")}>
                  Meta (FB/IG)
                </Chip>
                <Chip active={platforms.includes("tiktok")} onClick={() => togglePlatform("tiktok")}>
                  TikTok
                </Chip>
              </div>
            </Field>
          </div>
        )}

        {step === 1 && (
          <div className="flex max-w-[860px] flex-col gap-8">
            <div className="flex flex-col gap-3">
              <span className="text-[15px] text-muted">Was bewirbst du? Das verändert die Bewertungs-Vorschriften.</span>
              <div className="flex flex-col gap-3 md:flex-row">
                <OptionCard
                  active={offerType === "service"}
                  onClick={() => setOfferType("service")}
                  title="Service / Dienstleistung"
                  description="Vertrauen & Autorität zählen: Ergebnisse, Referenzen, die Person dahinter."
                />
                <OptionCard
                  active={offerType === "product"}
                  onClick={() => setOfferType("product")}
                  title="Eigenes Produkt / Brand"
                  description="Begehrlichkeit, klarer USP und Markenkonsistenz zählen."
                />
                <OptionCard
                  active={offerType === "dropshipping"}
                  onClick={() => setOfferType("dropshipping")}
                  title="Dropshipping"
                  description="Wow-Demo entscheidend; Skepsis-Abbau über Proof und Garantien."
                />
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <span className="text-[15px] text-muted">Preisklasse</span>
              <div className="flex gap-2.5">
                <Chip active={priceTier === "budget"} onClick={() => setPriceTier("budget")}>
                  Günstig
                </Chip>
                <Chip active={priceTier === "mid"} onClick={() => setPriceTier("mid")}>
                  Mittel
                </Chip>
                <Chip active={priceTier === "premium"} onClick={() => setPriceTier("premium")}>
                  Premium
                </Chip>
              </div>
              <span className="text-[13px] text-faint">
                Premium-Ads im Billig-Look verlieren Punkte — und umgekehrt.
              </span>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex max-w-[860px] flex-col gap-8">
            <div className="flex flex-col gap-3">
              <span className="text-[15px] text-muted">Was soll diese Kampagne erreichen?</span>
              <div className="flex flex-col gap-3 md:flex-row">
                <OptionCard
                  active={goal === "sales"}
                  onClick={() => {
                    setGoal("sales");
                    setMetric("sales");
                  }}
                  title="Verkaufen"
                  description="Direkt verkaufen. Bewertet werden Angebot, Kaufanreiz und der Weg zum Kauf."
                />
                <OptionCard
                  active={goal === "leads"}
                  onClick={() => {
                    setGoal("leads");
                    setMetric("sales");
                  }}
                  title="Leads generieren"
                  description="Kontakte sammeln. Bewertet werden Lead-Magnet und Einstiegshürde."
                />
                <OptionCard
                  active={goal === "brand"}
                  onClick={() => {
                    setGoal("brand");
                    setMetric("awareness");
                  }}
                  title="Marke aufbauen"
                  description="Brand bekannt machen. Einprägsamkeit und Emotion statt hartem Verkaufs-CTA."
                />
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <span className="text-[15px] text-muted">Was ist bei dieser Ad am wichtigsten? Der Score wird darauf optimiert.</span>
              <div className="flex flex-wrap gap-2.5">
                {(
                  [
                    ["impressions", "Impressionen"],
                    ["sales", "Sales"],
                    ["add_to_cart", "Add-to-Cart"],
                    ["checkout", "Checkout"],
                    ["awareness", "Bekanntheit"],
                  ] as [PrimaryMetric, string][]
                ).map(([value, label]) => (
                  <Chip key={value} active={metric === value} onClick={() => setMetric(value)}>
                    {label}
                  </Chip>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex max-w-[860px] flex-col gap-3">
            <span className="text-[15px] text-muted">
              Wofür ist die Ad gedacht? Das verändert, was „richtig“ ist — eine Cold-Ad wird anders bewertet als eine Bestandskunden-Ad.
            </span>
            <div className="flex flex-col gap-3 md:flex-row">
              <OptionCard
                active={funnelStage === "cold"}
                onClick={() => setFunnelStage("cold")}
                title="Cold / Neue Audience"
                description="Publikum kennt dich nicht: starker Hook, Erklärung, Social Proof nötig."
              />
              <OptionCard
                active={funnelStage === "retargeting"}
                onClick={() => setFunnelStage("retargeting")}
                title="Retargeting"
                description="Besucher & Interaktionen: Einwände behandeln, Dringlichkeit, kurzer Weg zurück."
              />
              <OptionCard
                active={funnelStage === "customers"}
                onClick={() => setFunnelStage("customers")}
                title="Bestandskunden"
                description="Bereits gekauft: Upsell/Cross-Sell, Loyalität — keine Kaltakquise-Ansprache."
              />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="flex max-w-[720px] flex-col gap-4">
            <span className="text-[15px] text-muted">
              Optional, aber stark: Mit Käufer-Profil prüft die Analyse, ob die Ad genau diesen Menschen trifft.
            </span>
            {projectPersonas.length === 0 ? (
              <Card className="flex flex-col items-start gap-3 p-6">
                <p className="text-[15px] text-muted">
                  Noch keine Käufer-Profile. Du kannst ohne weitermachen — oder unter „Käufer-Profile“ eines anlegen (auch per KI-Vorschlag).
                </p>
              </Card>
            ) : (
              <div className="flex flex-col gap-3">
                <OptionCard active={personaId === ""} onClick={() => setPersonaId("")} title="Ohne Käufer-Profil" description="Analyse ohne Persona-Abgleich." />
                {projectPersonas.map((p) => (
                  <OptionCard
                    key={p.id}
                    active={personaId === p.id}
                    onClick={() => setPersonaId(p.id)}
                    title={p.name}
                    description={`${p.demographics.slice(0, 90)} — Pains: ${p.pains.slice(0, 2).join(", ")}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {step === 5 && (
          <div className="flex max-w-[720px] flex-col gap-4">
            <label className="flex min-h-[180px] cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-line2 p-8 text-center transition-colors hover:border-accent/50">
              <input
                type="file"
                accept="image/*,video/mp4,video/webm,video/quicktime"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              <span className="text-[15px] font-medium">{uploading ? "Wird verarbeitet …" : "Bild oder Video auswählen"}</span>
              <span className="text-[13px] text-faint">
                Bild: JPG/PNG/WebP · Video: MP4/WebM — Keyframes (Sekunde 0 / 1 / 3 …) werden automatisch extrahiert
              </span>
            </label>
            {uploadError && <p className="text-sm text-flop">{uploadError}</p>}
            {frames.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-[13px] font-semibold text-muted">
                  {format === "video" ? `Video (${videoDuration}s) · ${frames.length} Keyframes` : "Creative"}
                </span>
                <div className="flex flex-wrap gap-3">
                  {frames.map((f, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={`data:${f.mediaType};base64,${f.data}`}
                      alt={f.label}
                      className="h-28 rounded-lg border border-line object-cover"
                    />
                  ))}
                </div>
              </div>
            )}
            <p className="text-[13px] text-faint">Ohne Creative wird nur die Copy bewertet — das Bild macht die Analyse deutlich präziser.</p>
          </div>
        )}

        {step === 6 && (
          <div className="flex max-w-[720px] flex-col gap-5">
            <Field label="Headline">
              <input className={inputCls} value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="z.B. Sensible Haut, die auf nichts reagiert?" />
            </Field>
            <Field label="Primärtext" hint="Der Text über/unter dem Creative. Die ersten 125 Zeichen zählen am meisten.">
              <textarea className={`${inputCls} min-h-[140px]`} value={primaryText} onChange={(e) => setPrimaryText(e.target.value)} placeholder="Dein Ad-Text …" />
            </Field>
            <Field label="CTA (Button/Handlungsaufforderung)">
              <input className={inputCls} value={cta} onChange={(e) => setCta(e.target.value)} placeholder="z.B. Jetzt shoppen" />
            </Field>
          </div>
        )}

        {step === 7 && (
          <div className="flex max-w-[720px] flex-col gap-5">
            <Card className="flex flex-col gap-3 p-6 text-[15px]">
              <div className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
                <span className="text-muted">Plattform(en)</span>
                <span className="font-medium">{platforms.map((p) => (p === "meta" ? "Meta" : "TikTok")).join(" + ")}</span>
                <span className="text-muted">Angebot</span>
                <span className="font-medium">
                  {{ product: "Eigenes Produkt", service: "Service", dropshipping: "Dropshipping" }[offerType]} ·{" "}
                  {{ budget: "günstig", mid: "mittel", premium: "Premium" }[priceTier]}
                </span>
                <span className="text-muted">Ziel · Metrik</span>
                <span className="font-medium">
                  {{ sales: "Verkaufen", leads: "Leads", brand: "Marke aufbauen" }[goal]} ·{" "}
                  {{ impressions: "Impressionen", sales: "Sales", add_to_cart: "Add-to-Cart", checkout: "Checkout", awareness: "Bekanntheit" }[metric]}
                </span>
                <span className="text-muted">Funnel-Stufe</span>
                <span className="font-medium">{{ cold: "Cold / Neue Audience", retargeting: "Retargeting", customers: "Bestandskunden" }[funnelStage]}</span>
                <span className="text-muted">Käufer-Profil</span>
                <span className="font-medium">{persona?.name ?? "—"}</span>
                <span className="text-muted">Creative</span>
                <span className="font-medium">{frames.length > 0 ? (format === "video" ? `Video · ${frames.length} Keyframes` : "Bild") : "Nur Copy"}</span>
              </div>
            </Card>
            {error && <p className="rounded-lg border border-flop/30 bg-flop/10 p-3.5 text-sm text-flop">{error}</p>}
            <div>
              <PrimaryButton onClick={startAnalysis} disabled={running}>
                {running ? "Analysiere … (bis zu 60 Sekunden)" : "Jetzt analysieren"}
              </PrimaryButton>
            </div>
          </div>
        )}

        {/* Footer nav */}
        <div className="mt-auto flex items-center justify-between border-t border-line pt-6">
          <GhostButton onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || running}>
            ← Zurück
          </GhostButton>
          {step < STEPS.length - 1 && (
            <PrimaryButton onClick={() => setStep((s) => s + 1)} disabled={!canNext()}>
              Weiter →
            </PrimaryButton>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AnalyzePage() {
  return (
    <Suspense>
      <AnalyzeWizard />
    </Suspense>
  );
}
