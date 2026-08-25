import { z } from "zod";
import { MAX_BID_CENTS, START_PRICE_CENTS } from "./types";

const httpUrl = z
  .string()
  .trim()
  .max(500)
  .refine(
    (value) => {
      try {
        const u = new URL(value);
        return u.protocol === "http:" || u.protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "Nur http(s)-Links sind erlaubt" }
  );

export const bidSchema = z.object({
  brand: z.string().trim().min(1, "Brand-Name fehlt").max(40),
  message: z.string().trim().min(1, "Botschaft fehlt").max(140),
  url: httpUrl.optional().or(z.literal("")).transform((v) => (v ? v : null)),
  imageUrl: httpUrl.optional().or(z.literal("")).transform((v) => (v ? v : null)),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Ungültige Farbe")
    .transform((v) => v.toLowerCase()),
  amountCents: z
    .number()
    .int()
    .min(START_PRICE_CENTS, "Mindestgebot ist $1")
    .max(MAX_BID_CENTS, "Gebot zu hoch"),
});

export type BidInput = z.infer<typeof bidSchema>;
