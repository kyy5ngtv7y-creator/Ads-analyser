// Orchestriert die Analyse: pro Plattform bewerten (Claude oder Demo-Engine),
// dann deterministisch aggregieren.

import { analyzeWithClaude, isAiAvailable, type RawAnalysisOutput } from "../ai/analyze";
import type { AdInput, AnalysisResult, CriterionResult, PlatformAnalysis } from "../types";
import { aggregate, CRITERIA, effectiveWeights, FRAMEWORK_VERSION } from "./framework";
import { analyzeDemo } from "./demo";

function toPlatformAnalysis(input: AdInput, platform: PlatformAnalysis["platform"], raw: RawAnalysisOutput): PlatformAnalysis {
  const weights = effectiveWeights(input.goal, input.primaryMetric);
  const order = new Map(CRITERIA.map((c, i) => [c.key, i]));
  const criteria: CriterionResult[] = raw.criteria
    .map((c) => ({
      key: c.key,
      score: Math.max(0, Math.min(100, Math.round(c.score))),
      weight: Math.round(weights[c.key] * 10) / 10,
      reasoning: c.reasoning,
      finding: c.finding ?? undefined,
    }))
    .sort((a, b) => (order.get(a.key) ?? 0) - (order.get(b.key) ?? 0));

  const { totalScore, verdict, appliedCaps } = aggregate(input, criteria);
  // Band statt Scheinpräzision: LLM-Teilscores schwanken zwischen Läufen leicht.
  const halfBand = 4;
  return {
    platform,
    totalScore,
    scoreBand: [Math.max(0, totalScore - halfBand), Math.min(100, totalScore + halfBand)] as [number, number],
    verdict,
    criteria,
    appliedCaps,
    summary: raw.summary,
    platformAdvice: raw.platformAdvice,
  };
}

export async function runAnalysis(input: AdInput): Promise<AnalysisResult> {
  const useClaude = isAiAvailable();
  const perPlatform: { platform: PlatformAnalysis["platform"]; raw: RawAnalysisOutput }[] = [];

  for (const platform of input.platforms) {
    const raw = useClaude ? await analyzeWithClaude(input, platform) : analyzeDemo(input, platform);
    perPlatform.push({ platform, raw });
  }

  const results = perPlatform.map(({ platform, raw }) => toPlatformAnalysis(input, platform, raw));

  // Verbesserungen + Rewrites von der besten Plattform übernehmen (sie sind ad-, nicht plattformspezifisch)
  const primary = perPlatform[0].raw;

  let crossPlatformAdvice: string | undefined;
  if (results.length === 2) {
    const [a, b] = results;
    const better = a.totalScore >= b.totalScore ? a : b;
    const worse = a.totalScore >= b.totalScore ? b : a;
    crossPlatformAdvice =
      better.totalScore === worse.totalScore
        ? "Beide Plattformen schneiden gleich ab — entscheide nach Zielgruppen-Präsenz und CPM."
        : `Empfehlung: Zuerst auf ${better.platform === "meta" ? "Meta" : "TikTok"} schalten (${better.totalScore}% vs. ${worse.totalScore}%). ${worse.platformAdvice}`;
  }

  const { creativeFrames, ...inputRest } = input;
  return {
    id: `an_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    frameworkVersion: FRAMEWORK_VERSION,
    engine: useClaude ? "claude" : "demo",
    input: {
      ...inputRest,
      frameCount: creativeFrames.length,
      creativePreview: creativeFrames[0] ? `data:${creativeFrames[0].mediaType};base64,${creativeFrames[0].data}` : undefined,
    },
    results,
    improvements: primary.improvements.slice(0, 5),
    rewrites: primary.rewrites,
    crossPlatformAdvice,
  };
}
