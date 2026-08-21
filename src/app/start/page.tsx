"use client";

// Express-Analyse: eine Seite, keine Anmeldung, smarte Defaults.
// Der schnellste Weg vom Besucher zum Aha-Moment.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Chip, Field, PrimaryButton, inputCls } from "@/components/ui";
import { getUsage, recordAnalysisUse, saveAnalysis, trialState } from "@/lib/store";
import type { AdInput, AnalysisResult, CampaignGoal, FunnelStage, OfferType, Platform, PriceTier } from "@/lib/types";
import { extractVideoFrames, fileToBase64Image, type ExtractedFrame } from "@/lib/video";

type Frame = ExtractedFrame | { data: string; mediaType: "image/jpeg" | "image/png" | "image/webp"; label: string };

export default function StartPage() {
  const router = useRouter();
  const [product, setProduct] = useState("");
  const [copy, setCopy] = useState("");
  const [platform, setPlatform] = useState<Platform>("meta");
  const [goal, setGoal] = useState<CampaignGoal>("sales");
  const [funnelStage, setFunnelStage] = useState<FunnelStage>("cold");
  const [showMore, setShowMore] = useState(false);
  const [offerType, setOfferType] = useState<OfferType>("product");
  const [priceTier, setPriceTier] = useState<PriceTier>("mid");
  const [cta, setCta] = useState("");
  const [frames, setFrames] = useState<Frame[]>([]);
  const [format, setFormat] = useState<"image" | "video">("image");
  const [videoDuration, setVideoDuration] = useState<number | undefined>();
  const [uploading, setUploading] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (file: File) => {
    setError("");
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
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload fehlgeschlagen.");
    } finally {
      setUploading(false);
    }
  };

  const run = async () => {
    const usage = getUsage();
    const state = trialState(usage);
    if (state.blocked) {
      router.push("/checkout?plan=standard");
      return;
    }
    setRunning(true);
    setError("");
    const input: AdInput = {
      projectName: product.split(/[,.–—-]/)[0].trim().slice(0, 40) || "Mein Angebot",
      productDescription: product.trim(),
      offerType,
      priceTier,
      platforms: [platform],
      format,
      goal,
      primaryMetric: goal === "brand" ? "awareness" : "sales",
      funnelStage,
      copy: { headline: "", primaryText: copy.trim(), cta: cta.trim() },
      persona: null,
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
      saveAnalysis(result);
      recordAnalysisUse(1);
      router.push(`/analysis/${result.id}?from=start`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analyse fehlgeschlagen.");
      setRunning(false);
    }
  };

  const canRun = product.trim().length > 5 && copy.trim().length > 10;

  return (
    <div className="mx-auto flex min-h-screen max-w-[760px] flex-col px-6 pb-16">
      <nav className="flex items-center justify-between py-5">
        <Link href="/" className="flex items-center gap-2.5">
          <svg width="24" height="24" viewBox="0 0 26 26" fill="none" aria-hidden>
            <rect x="1" y="1" width="24" height="24" rx="7" style={{ stroke: "var(--accent-text)" }} strokeWidth="2" />
            <path d="M7 16.5 L11 9 L14.5 14 L19 7.5" style={{ stroke: "var(--accent-text)" }} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="font-display text-[17px] font-bold">Ads·Analyser</span>
        </Link>
        <Link href="/dashboard" className="text-sm font-medium text-muted hover:text-ink">
          Zum Dashboard
        </Link>
      </nav>

      <div className="flex flex-col gap-2 pb-8 pt-6 text-center">
        <h1 className="font-display text-[32px] font-bold leading-tight" style={{ textWrap: "balance" }}>
          Bekommt deine Ad einen Winner-Score?
        </h1>
        <p className="text-[16px] text-muted">
          Ergebnis in unter 60 Sekunden. Keine Anmeldung, keine Kreditkarte — die ersten 3 Analysen sind gratis.
        </p>
      </div>

      <div className="flex flex-col gap-5 rounded-2xl border border-line bg-surface p-6 shadow-[var(--card-shadow)] sm:p-8">
        <Field label="Was verkaufst du?">
          <input
            className={inputCls}
            value={product}
            onChange={(e) => setProduct(e.target.value)}
            placeholder="z.B. Bakuchiol-Serum für sensible Haut, CHF 89"
          />
        </Field>

        <Field label="Deine Ad-Copy" hint="Primärtext der Anzeige — einfach reinkopieren.">
          <textarea
            className={`${inputCls} min-h-[110px]`}
            value={copy}
            onChange={(e) => setCopy(e.target.value)}
            placeholder="Kopiere hier den Text deiner Anzeige rein …"
          />
        </Field>

        <label className="flex min-h-[86px] cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-line2 p-4 text-center transition-colors hover:border-accent/50">
          <input
            type="file"
            accept="image/*,video/mp4,video/webm,video/quicktime"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <span className="text-[14px] font-medium">
            {uploading ? "Wird verarbeitet …" : frames.length > 0 ? `✓ ${format === "video" ? `Video (${videoDuration}s)` : "Bild"} geladen — ersetzen?` : "Creative dazulegen (Bild oder Video)"}
          </span>
          <span className="text-[12px] text-faint">Optional, macht die Analyse deutlich präziser</span>
        </label>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Plattform">
            <div className="flex gap-2">
              <Chip active={platform === "meta"} onClick={() => setPlatform("meta")}>Meta</Chip>
              <Chip active={platform === "tiktok"} onClick={() => setPlatform("tiktok")}>TikTok</Chip>
            </div>
          </Field>
          <Field label="Ziel">
            <div className="flex gap-2">
              <Chip active={goal === "sales"} onClick={() => setGoal("sales")}>Verkauf</Chip>
              <Chip active={goal === "leads"} onClick={() => setGoal("leads")}>Leads</Chip>
              <Chip active={goal === "brand"} onClick={() => setGoal("brand")}>Brand</Chip>
            </div>
          </Field>
          <Field label="Zielgruppe">
            <div className="flex gap-2">
              <Chip active={funnelStage === "cold"} onClick={() => setFunnelStage("cold")}>Neu</Chip>
              <Chip active={funnelStage === "retargeting"} onClick={() => setFunnelStage("retargeting")}>Retargeting</Chip>
            </div>
          </Field>
        </div>

        <button type="button" onClick={() => setShowMore((v) => !v)} className="self-start text-[13px] font-medium text-muted hover:text-ink">
          {showMore ? "− Weniger Optionen" : "+ Mehr Optionen (Angebots-Typ, Preisklasse, CTA)"}
        </button>
        {showMore && (
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Angebots-Typ">
              <select className={inputCls} value={offerType} onChange={(e) => setOfferType(e.target.value as OfferType)}>
                <option value="product">Eigenes Produkt</option>
                <option value="service">Service</option>
                <option value="dropshipping">Dropshipping</option>
              </select>
            </Field>
            <Field label="Preisklasse">
              <select className={inputCls} value={priceTier} onChange={(e) => setPriceTier(e.target.value as PriceTier)}>
                <option value="budget">günstig</option>
                <option value="mid">mittel</option>
                <option value="premium">premium</option>
              </select>
            </Field>
            <Field label="CTA-Button">
              <input className={inputCls} value={cta} onChange={(e) => setCta(e.target.value)} placeholder="z.B. Jetzt shoppen" />
            </Field>
          </div>
        )}

        {error && <p className="rounded-lg border border-flop/30 bg-flop/10 p-3 text-sm text-flop">{error}</p>}

        <PrimaryButton onClick={run} disabled={!canRun || running}>
          {running ? "Analysiere … (bis zu 60 Sekunden)" : "Gratis analysieren →"}
        </PrimaryButton>
        <p className="text-center text-[12px] text-faint">
          Volle Analyse im 8-Schritte-Modus mit Käufer-Profil: <Link href="/analyze" className="text-accent-text">zum Profi-Wizard</Link>
        </p>
      </div>
    </div>
  );
}
