// Claude-Anbindung: bewertet eine Ad pro Plattform via Structured Output.

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { AdInput, CriterionKey, Platform } from "../types";
import { ANALYSIS_SYSTEM_PROMPT, buildAnalysisPrompt } from "../scoring/prompts";

export const ANALYSIS_MODEL = process.env.ANALYSIS_MODEL || "claude-opus-5";

export function isAiAvailable(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (!_client) _client = new Anthropic();
  return _client;
}

const CriterionScoreSchema = z.object({
  key: z.enum(["hook", "clarity", "audience_fit", "copywriting", "cta", "visual", "trust", "policy"]),
  score: z.number().min(0).max(100),
  reasoning: z.string(),
  finding: z.string().nullable(),
});

const AnalysisOutputSchema = z.object({
  criteria: z.array(CriterionScoreSchema),
  summary: z.string(),
  platformAdvice: z.string(),
  improvements: z.array(
    z.object({
      priority: z.number(),
      title: z.string(),
      detail: z.string(),
      expectedImpact: z.string(),
    })
  ),
  rewrites: z.array(
    z.object({
      field: z.enum(["headline", "primaryText", "cta"]),
      label: z.string(),
      original: z.string(),
      rewritten: z.string(),
    })
  ),
});

export type RawAnalysisOutput = z.infer<typeof AnalysisOutputSchema>;

export async function analyzeWithClaude(input: AdInput, platform: Platform): Promise<RawAnalysisOutput> {
  const imageBlocks: Anthropic.ContentBlockParam[] = input.creativeFrames.map((frame) => ({
    type: "image" as const,
    source: { type: "base64" as const, media_type: frame.mediaType, data: frame.data },
  }));

  const response = await client().messages.parse({
    model: ANALYSIS_MODEL,
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    system: ANALYSIS_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [...imageBlocks, { type: "text", text: buildAnalysisPrompt(input, platform) }],
      },
    ],
    output_config: { format: zodOutputFormat(AnalysisOutputSchema) },
  });

  const parsed = response.parsed_output;
  if (!parsed) {
    throw new Error("Analyse-Antwort konnte nicht geparst werden.");
  }
  // Fehlende Kriterien defensiv abfangen
  const seen = new Set(parsed.criteria.map((c) => c.key));
  const missing = (["hook", "clarity", "audience_fit", "copywriting", "cta", "visual", "trust", "policy"] as CriterionKey[]).filter(
    (k) => !seen.has(k)
  );
  if (missing.length > 0) {
    throw new Error(`Analyse unvollständig — fehlende Kriterien: ${missing.join(", ")}`);
  }
  return parsed;
}
