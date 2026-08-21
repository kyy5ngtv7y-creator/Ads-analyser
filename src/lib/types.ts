// Zentrale Domänen-Typen des Ads-Analysers.

export type Platform = "meta" | "tiktok";
export type AdFormat = "image" | "video";
export type CampaignGoal = "sales" | "leads" | "brand";
export type PrimaryMetric = "impressions" | "sales" | "add_to_cart" | "checkout" | "awareness";
export type OfferType = "service" | "product" | "dropshipping";
export type PriceTier = "budget" | "mid" | "premium";
export type FunnelStage = "cold" | "retargeting" | "customers";

export type CriterionKey =
  | "hook"
  | "clarity"
  | "audience_fit"
  | "copywriting"
  | "cta"
  | "visual"
  | "trust"
  | "policy";

export type Verdict = "winner" | "solid" | "risky" | "flop";

export interface Persona {
  id: string;
  projectId: string;
  name: string;
  demographics: string;
  pains: string[];
  desires: string[];
  objections: string[];
  awarenessLevel: string;
  tone: string;
}

export interface Project {
  id: string;
  name: string;
  productDescription: string;
  offerType: OfferType;
  priceTier: PriceTier;
  createdAt: string;
}

export interface AdCopy {
  primaryText: string;
  headline: string;
  cta: string;
}

/** Vollständiger Eingabe-Kontext einer Analyse. */
export interface AdInput {
  projectName: string;
  productDescription: string;
  offerType: OfferType;
  priceTier: PriceTier;
  platforms: Platform[];
  format: AdFormat;
  goal: CampaignGoal;
  primaryMetric: PrimaryMetric;
  funnelStage: FunnelStage;
  copy: AdCopy;
  persona?: Persona | null;
  /** Base64-JPEG/PNG-Frames: bei Bild-Ads genau eines, bei Video 3–6 Keyframes. */
  creativeFrames: { data: string; mediaType: "image/jpeg" | "image/png" | "image/webp"; label: string }[];
  videoDurationSec?: number;
}

export interface CriterionResult {
  key: CriterionKey;
  score: number; // 0–100
  weight: number; // effektives Gewicht nach Kontext-Anpassung
  reasoning: string;
  finding?: string;
}

export interface Improvement {
  priority: number;
  title: string;
  detail: string;
  expectedImpact: string;
}

export interface CopyRewrite {
  field: "headline" | "primaryText" | "cta";
  label: string;
  original: string;
  rewritten: string;
}

export interface PlatformAnalysis {
  platform: Platform;
  totalScore: number;
  verdict: Verdict;
  criteria: CriterionResult[];
  appliedCaps: string[];
  summary: string;
  platformAdvice: string;
}

export interface AnalysisResult {
  id: string;
  createdAt: string;
  frameworkVersion: string;
  engine: "claude" | "demo";
  input: Omit<AdInput, "creativeFrames"> & { creativePreview?: string; frameCount: number };
  results: PlatformAnalysis[];
  improvements: Improvement[];
  rewrites: CopyRewrite[];
  crossPlatformAdvice?: string;
}

export interface AngleSuggestion {
  type: string;
  typeLabel: string;
  title: string;
  coreMessage: string;
  hooks: string[];
  creativeIdea: string;
  copyStructure: string;
  funnelFit: Record<FunnelStage, "strong" | "ok" | "weak">;
}
