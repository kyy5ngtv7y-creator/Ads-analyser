"use client";

// Client-seitige Persistenz (localStorage) für den MVP-Betrieb ohne Datenbank.
// Phase 2 ersetzt diese Schicht durch Supabase (siehe README + db/schema.sql).

import type { AnalysisResult, AngleSuggestion, Persona, Project } from "./types";
import { planById, TRIAL_DAYS } from "./billing/plans";

const KEYS = {
  projects: "adsanalyser.projects",
  personas: "adsanalyser.personas",
  analyses: "adsanalyser.analyses",
  angles: "adsanalyser.angles",
  usage: "adsanalyser.usage",
} as const;

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Speicher voll oder blockiert — App bleibt funktionsfähig, nur ohne Persistenz.
  }
}

export function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

// ---- Projekte ----
export function getProjects(): Project[] {
  return read<Project[]>(KEYS.projects, []);
}
export function saveProject(project: Project): void {
  const all = getProjects().filter((p) => p.id !== project.id);
  write(KEYS.projects, [project, ...all]);
}
export function deleteProject(id: string): void {
  write(KEYS.projects, getProjects().filter((p) => p.id !== id));
}

// ---- Personas ----
export function getPersonas(projectId?: string): Persona[] {
  const all = read<Persona[]>(KEYS.personas, []);
  return projectId ? all.filter((p) => p.projectId === projectId) : all;
}
export function savePersona(persona: Persona): void {
  const all = read<Persona[]>(KEYS.personas, []).filter((p) => p.id !== persona.id);
  write(KEYS.personas, [persona, ...all]);
}
export function deletePersona(id: string): void {
  write(KEYS.personas, read<Persona[]>(KEYS.personas, []).filter((p) => p.id !== id));
}

// ---- Analysen ----
export interface StoredAnalysis extends AnalysisResult {
  projectId?: string;
}
export function getAnalyses(): StoredAnalysis[] {
  return read<StoredAnalysis[]>(KEYS.analyses, []);
}
export function getAnalysis(id: string): StoredAnalysis | undefined {
  return getAnalyses().find((a) => a.id === id);
}
export function saveAnalysis(analysis: StoredAnalysis): void {
  const all = getAnalyses().filter((a) => a.id !== analysis.id);
  // Vorschau-Bilder klein halten: max. 40 gespeicherte Analysen
  write(KEYS.analyses, [analysis, ...all].slice(0, 40));
}

// ---- Angles ----
export interface StoredAngleSet {
  id: string;
  projectId?: string;
  createdAt: string;
  context: { projectName: string; goal: string; funnelStage: string; personaName?: string };
  angles: AngleSuggestion[];
}
export function getAngleSets(): StoredAngleSet[] {
  return read<StoredAngleSet[]>(KEYS.angles, []);
}
export function saveAngleSet(set: StoredAngleSet): void {
  write(KEYS.angles, [set, ...getAngleSets()].slice(0, 20));
}

// ---- Leads (E-Mail-Capture; Phase 2 sendet an Backend/CRM) ----
export interface Lead {
  email: string;
  source: "report_gate" | "checkout";
  plan?: string;
  createdAt: string;
}
export function getLead(): Lead | null {
  return read<Lead | null>("adsanalyser.lead", null);
}
export function saveLead(lead: Omit<Lead, "createdAt">): Lead {
  const full: Lead = { ...lead, createdAt: new Date().toISOString() };
  write("adsanalyser.lead", full);
  return full;
}

// ---- Trial / Nutzung (MVP: clientseitig; Phase 4 ersetzt durch Stripe + Server) ----
export interface Usage {
  trialStartedAt: string;
  analysesUsed: number;
  plan: "trial" | "standard" | "pro" | "agency";
}
export function getUsage(): Usage {
  const usage = read<Usage | null>(KEYS.usage, null);
  if (usage) return usage;
  const fresh: Usage = { trialStartedAt: new Date().toISOString(), analysesUsed: 0, plan: "trial" };
  write(KEYS.usage, fresh);
  return fresh;
}
/** Eine Analyse pro bewerteter Plattform — "beide" verbraucht 2. */
export function recordAnalysisUse(count = 1): Usage {
  const usage = getUsage();
  const next = { ...usage, analysesUsed: usage.analysesUsed + Math.max(1, count) };
  write(KEYS.usage, next);
  return next;
}
export function setPlan(plan: Usage["plan"]): Usage {
  const next = { ...getUsage(), plan, analysesUsed: 0 };
  write(KEYS.usage, next);
  return next;
}
export function trialState(usage: Usage): { daysLeft: number; analysesLeft: number; blocked: boolean } {
  const limit = planById(usage.plan).analysesPerMonth;
  const analysesLeft = Math.max(0, limit - usage.analysesUsed);
  if (usage.plan !== "trial") {
    return { daysLeft: Infinity, analysesLeft, blocked: analysesLeft <= 0 };
  }
  const started = new Date(usage.trialStartedAt).getTime();
  const daysLeft = Math.max(0, TRIAL_DAYS - Math.floor((Date.now() - started) / 86400000));
  return { daysLeft, analysesLeft, blocked: daysLeft <= 0 || analysesLeft <= 0 };
}
