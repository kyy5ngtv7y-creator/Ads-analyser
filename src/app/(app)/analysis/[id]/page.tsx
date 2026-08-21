"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, ScoreBar, ScoreGauge, VerdictBadge, scoreColor } from "@/components/ui";
import { CRITERIA, VERDICT_META } from "@/lib/scoring/framework";
import { getAnalysis, type StoredAnalysis } from "@/lib/store";
import type { PlatformAnalysis } from "@/lib/types";

const CRITERIA_LABEL = new Map(CRITERIA.map((c) => [c.key, c.label]));

export default function AnalysisPage() {
  const params = useParams<{ id: string }>();
  const [analysis, setAnalysis] = useState<StoredAnalysis | null | undefined>(undefined);
  const [activePlatform, setActivePlatform] = useState<string>("");

  useEffect(() => {
    const a = getAnalysis(params.id);
    setAnalysis(a ?? null);
    if (a) setActivePlatform(a.results[0].platform);
  }, [params.id]);

  if (analysis === undefined) return <div className="p-10 text-muted">Lade …</div>;
  if (analysis === null)
    return (
      <div className="flex flex-col items-start gap-4 p-10">
        <p className="text-muted">Analyse nicht gefunden (sie wird lokal in deinem Browser gespeichert).</p>
        <Link href="/analyze" className="text-accent">
          Neue Analyse starten
        </Link>
      </div>
    );

  const active: PlatformAnalysis = analysis.results.find((r) => r.platform === activePlatform) ?? analysis.results[0];
  const meta = VERDICT_META[active.verdict];

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-10">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Link href="/history" className="text-sm text-muted hover:text-ink">
            ← Zur Historie
          </Link>
          <h1 className="font-display text-[26px] font-bold">{analysis.input.projectName}</h1>
          <div className="flex flex-wrap gap-1.5">
            {[
              analysis.input.format === "video" ? "Video" : "Bild",
              { product: "Eigenes Produkt", service: "Service", dropshipping: "Dropshipping" }[analysis.input.offerType] +
                " · " +
                { budget: "günstig", mid: "mittel", premium: "Premium" }[analysis.input.priceTier],
              "Ziel: " + { sales: "Verkaufen", leads: "Leads", brand: "Marke aufbauen" }[analysis.input.goal],
              { cold: "Cold Audience", retargeting: "Retargeting", customers: "Bestandskunden" }[analysis.input.funnelStage],
              ...(analysis.input.persona ? [`Profil: ${analysis.input.persona.name}`] : []),
            ].map((chip) => (
              <span key={chip} className="rounded-full border border-line2 px-2.5 py-1 text-xs font-semibold text-muted">
                {chip}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 text-[13px] text-faint">
          {analysis.engine === "demo" && (
            <span className="rounded-full border border-warn/40 px-3 py-1.5 font-semibold text-warn">
              Demo-Modus (ohne ANTHROPIC_API_KEY) — heuristische Bewertung
            </span>
          )}
          <span>Framework v{analysis.frameworkVersion}</span>
        </div>
      </div>

      {/* Gauge + platforms */}
      <div className="grid gap-5 lg:grid-cols-[440px_minmax(0,1fr)]">
        <Card className="flex flex-col items-center gap-3 p-8">
          {analysis.input.creativePreview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={analysis.input.creativePreview} alt="Creative" className="mb-2 max-h-40 rounded-lg border border-line object-contain" />
          )}
          <ScoreGauge score={active.totalScore} />
          <span
            className="flex items-center gap-2 rounded-full px-5 py-2 text-[15px] font-bold"
            style={{ background: `${scoreColor(active.totalScore)}1f`, color: scoreColor(active.totalScore) }}
          >
            {meta.label.toUpperCase()} — {meta.advice}
          </span>
          <p className="text-center text-sm leading-relaxed text-muted">{active.summary}</p>
          <div className="mt-1 flex flex-wrap justify-center gap-4 text-xs text-faint">
            <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-win" />Winner ≥ 75</span>
            <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-solid" />Solide 55–74</span>
            <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-warn" />Riskant 35–54</span>
            <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-flop" />Flop &lt; 35</span>
          </div>
        </Card>

        <div className="flex flex-col gap-5">
          <Card className="flex flex-col gap-4 p-6">
            <h2 className="font-display text-[17px] font-semibold">Plattform-Vergleich</h2>
            <div className={`grid gap-4 ${analysis.results.length > 1 ? "sm:grid-cols-2" : ""}`}>
              {analysis.results.map((r) => {
                const isActive = r.platform === active.platform;
                return (
                  <button
                    key={r.platform}
                    type="button"
                    onClick={() => setActivePlatform(r.platform)}
                    className={`flex flex-col gap-1.5 rounded-xl border p-4 text-left transition-colors ${
                      isActive ? "border-accent/50 bg-accent/5" : "border-line2 hover:bg-surface2"
                    }`}
                  >
                    <span className="flex items-center justify-between">
                      <span className="text-[15px] font-semibold">{r.platform === "meta" ? "Meta (FB/IG)" : "TikTok"}</span>
                      <VerdictBadge verdict={r.verdict} />
                    </span>
                    <span className="font-display text-3xl font-bold" style={{ color: scoreColor(r.totalScore) }}>
                      {r.totalScore}%
                    </span>
                    <span className="text-[13px] leading-relaxed text-muted">{r.platformAdvice}</span>
                  </button>
                );
              })}
            </div>
            {analysis.crossPlatformAdvice && <p className="text-sm leading-relaxed text-muted">{analysis.crossPlatformAdvice}</p>}
          </Card>

          {active.appliedCaps.length > 0 && (
            <div className="flex flex-col gap-2 rounded-xl border border-warn/30 bg-warn/5 p-5">
              {active.appliedCaps.map((cap) => (
                <p key={cap} className="text-sm leading-relaxed text-[#B9C1D2]">
                  <strong className="text-warn">Hard-Cap aktiv:</strong> {cap}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Criteria */}
      <Card className="flex flex-col p-6">
        <div className="flex items-center justify-between pb-3">
          <h2 className="font-display text-lg font-semibold">
            Bewertung nach Kriterien{" "}
            <span className="text-sm font-medium text-faint">· {active.platform === "meta" ? "Meta" : "TikTok"}</span>
          </h2>
          <span className="text-[13px] text-muted">Gewichteter Durchschnitt → {active.totalScore}%</span>
        </div>
        {active.criteria.map((c) => (
          <div key={c.key} className="flex flex-col gap-2 border-t border-line py-4 md:flex-row md:items-start md:gap-5">
            <div className="w-full shrink-0 md:w-[240px]">
              <div className="text-[15px] font-semibold">{CRITERIA_LABEL.get(c.key)}</div>
              <div className="text-xs text-faint">Gewicht {c.weight}%</div>
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <ScoreBar score={c.score} />
              <p className="text-[13px] leading-relaxed text-muted">{c.reasoning}</p>
            </div>
            <span className="font-display w-12 shrink-0 text-right text-xl font-bold" style={{ color: scoreColor(c.score) }}>
              {c.score}
            </span>
          </div>
        ))}
      </Card>

      {/* Improvements + rewrites */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="flex flex-col gap-4 p-6">
          <h2 className="font-display text-lg font-semibold">Priorisierte Verbesserungen</h2>
          {analysis.improvements.map((imp) => (
            <div key={imp.priority} className="flex items-start gap-3.5">
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold"
                style={{
                  background: imp.priority === 1 ? "rgba(248,113,113,0.15)" : imp.priority === 2 ? "rgba(251,191,36,0.15)" : "rgba(138,147,166,0.15)",
                  color: imp.priority === 1 ? "#F87171" : imp.priority === 2 ? "#FBBF24" : "#8A93A6",
                }}
              >
                {imp.priority}
              </span>
              <p className="text-sm leading-relaxed text-[#B9C1D2]">
                <strong className="text-ink">{imp.title}.</strong> {imp.detail}{" "}
                <span className="text-faint">({imp.expectedImpact})</span>
              </p>
            </div>
          ))}
        </Card>

        <Card className="flex flex-col gap-4 p-6">
          <h2 className="font-display text-lg font-semibold">Copy-Rewrites</h2>
          {analysis.rewrites.map((rw, i) => (
            <div key={i} className="flex flex-col gap-2">
              <div className="rounded-lg border border-line2 p-3.5">
                <span className="text-[11px] font-bold tracking-wider text-faint">
                  ORIGINAL · {{ headline: "HEADLINE", primaryText: "PRIMÄRTEXT", cta: "CTA" }[rw.field]}
                </span>
                <p className="text-[15px] text-muted">{rw.original}</p>
              </div>
              <div className="rounded-lg border border-accent/35 bg-accent/5 p-3.5">
                <span className="text-[11px] font-bold tracking-wider text-accent">{rw.label.toUpperCase()}</span>
                <p className="text-[15px]">{rw.rewritten}</p>
              </div>
            </div>
          ))}
        </Card>
      </div>

      <div className="flex gap-3">
        <Link href="/analyze" className="rounded-lg bg-accent px-5 py-3 text-[15px] font-semibold text-accent-ink hover:opacity-90">
          Variante testen
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-lg border border-line2 px-5 py-3 text-[15px] font-medium hover:bg-surface2"
        >
          Als PDF exportieren
        </button>
      </div>
    </div>
  );
}
