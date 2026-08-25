import { z } from "zod";
import { MAX_BID_CENTS, START_PRICE_CENTS } from "./types";

function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

const httpUrl = z
  .string()
  .trim()
  .max(500)
  .refine(isHttpUrl, { message: "Nur http(s)-Links sind erlaubt" });

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
    message: z.string().trim().min(1, "Beschreibung fehlt").max(200),
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
    url: httpUrl.optional().or(z.literal("")).transform((v) => (v ? v : null)),
    logo: logo.optional().or(z.literal("")).transform((v) => (v ? v : null)),
    color: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, "Ungültige Farbe")
      .transform((v) => v.toLowerCase()),
    amountCents: z
      .number()
      .int()
      .min(START_PRICE_CENTS, "Mindestgebot ist $1")
      .max(MAX_BID_CENTS, "Gebot zu hoch"),
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
