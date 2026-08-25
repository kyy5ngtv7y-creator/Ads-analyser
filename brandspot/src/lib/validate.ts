import { z } from "zod";
import {
  CATEGORIES,
  cleanUrl,
  isBlockedUrl,
  MAX_BID_CENTS,
  START_PRICE_CENTS,
} from "./types";

function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

// Leer erlaubt (→ null); sonst http(s) und keine Chat-/Invite-Links.
// Query-Parameter und Fragmente werden entfernt – Klicks gehen zur
// eingereichten URL ohne Tracking-Parameter.
const optionalHttpUrl = z
  .string()
  .trim()
  .max(500)
  .optional()
  .transform((v) => v ?? "")
  .superRefine((v, ctx) => {
    if (!v) return;
    if (!isHttpUrl(v)) {
      ctx.addIssue({ code: "custom", message: "Nur http(s)-Links sind erlaubt" });
    } else if (isBlockedUrl(v)) {
      ctx.addIssue({
        code: "custom",
        message:
          "Chat- und Invite-Links (Telegram, WhatsApp, Discord, …) sind nicht erlaubt",
      });
    }
  })
  .transform((v) => (v ? (cleanUrl(v) ?? v) : null));

// Logo: entweder ein http(s)-Link oder ein hochgeladenes Bild als data-URI
// (max. ~300 KB, nur gängige Bildformate – kein SVG, um Script-Inhalte auszuschließen).
const logo = z
  .string()
  .trim()
  .max(400_000, "Logo ist zu groß (max. ~300 KB)")
  .refine(
    (v) =>
      isHttpUrl(v) ||
      /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(v),
    { message: "Logo muss ein Bild-Upload oder ein http(s)-Link sein" }
  );

export const bidSchema = z
  .object({
    brand: z.string().trim().min(1, "Brand-Name fehlt").max(40),
    title: z
      .string()
      .trim()
      .max(70)
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : null)),
    message: z.string().trim().min(1, "Beschreibung fehlt").max(200),
    category: z.enum(CATEGORIES).catch("Sonstiges"),
    locationType: z.enum(["online", "physical", "both"]),
    address: z
      .string()
      .trim()
      .max(160)
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : null)),
    country: z
      .string()
      .trim()
      .max(56)
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : null)),
    url: optionalHttpUrl,
    logo: logo.optional().or(z.literal("")).transform((v) => (v ? v : null)),
    amountCents: z
      .number()
      .int()
      .min(START_PRICE_CENTS, "Mindestgebot ist $1")
      .max(MAX_BID_CENTS, "Gebot zu hoch")
      .multipleOf(100, "Gebote nur in ganzen Dollar"),
  })
  .superRefine((data, ctx) => {
    if (data.locationType !== "online" && !data.address) {
      ctx.addIssue({
        code: "custom",
        path: ["address"],
        message: "Für einen physischen Ort brauchen wir eine Adresse",
      });
    }
    if (data.locationType !== "physical" && !data.url) {
      ctx.addIssue({
        code: "custom",
        path: ["url"],
        message: "Für eine Online-Brand brauchen wir eine Website",
      });
    }
  });

export type BidInput = z.infer<typeof bidSchema>;
