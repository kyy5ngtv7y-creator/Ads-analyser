import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import {
  MIN_INCREMENT_CENTS,
  minNextBidCents,
  type SpotState,
  type Takeover,
} from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "spot.json");
const HISTORY_LIMIT = 100;

const EMPTY_STATE: SpotState = {
  current: null,
  history: [],
  totalRaisedCents: 0,
};

// Serialisiert alle Schreibzugriffe innerhalb dieses Prozesses,
// damit zwei gleichzeitige Gebote sich nicht gegenseitig überschreiben.
let writeQueue: Promise<unknown> = Promise.resolve();

async function readState(): Promise<SpotState> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as SpotState;
    if (typeof parsed !== "object" || parsed === null) return { ...EMPTY_STATE };
    return {
      current: parsed.current ?? null,
      history: Array.isArray(parsed.history) ? parsed.history : [],
      totalRaisedCents:
        typeof parsed.totalRaisedCents === "number" ? parsed.totalRaisedCents : 0,
    };
  } catch {
    return { ...EMPTY_STATE };
  }
}

async function writeState(state: SpotState): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${DATA_FILE}.${randomUUID()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(state, null, 2), "utf8");
  await fs.rename(tmp, DATA_FILE);
}

export async function getSpotState(): Promise<SpotState> {
  return readState();
}

export type TakeoverInput = {
  brand: string;
  message: string;
  url: string | null;
  imageUrl: string | null;
  color: string;
  amountCents: number;
};

export type ApplyResult =
  | { ok: true; takeover: Takeover; state: SpotState }
  | { ok: false; reason: "outbid"; minNextBidCents: number };

/**
 * Wendet eine Übernahme an, sofern das Gebot (immer noch) hoch genug ist.
 * Bei Stripe-Zahlungen kann zwischen Checkout und Webhook jemand anderes
 * übernommen haben – dann schlägt die Übernahme fehl ("outbid").
 */
export async function applyTakeover(input: TakeoverInput): Promise<ApplyResult> {
  const task = writeQueue.then(async (): Promise<ApplyResult> => {
    const state = await readState();
    const min = minNextBidCents(state);
    if (input.amountCents < min) {
      return { ok: false, reason: "outbid", minNextBidCents: min };
    }
    const takeover: Takeover = {
      id: randomUUID(),
      brand: input.brand,
      message: input.message,
      url: input.url,
      imageUrl: input.imageUrl,
      color: input.color,
      amountCents: input.amountCents,
      createdAt: new Date().toISOString(),
    };
    const next: SpotState = {
      current: takeover,
      history: [
        ...(state.current ? [state.current] : []),
        ...state.history,
      ].slice(0, HISTORY_LIMIT),
      totalRaisedCents: state.totalRaisedCents + input.amountCents,
    };
    await writeState(next);
    return { ok: true, takeover, state: next };
  });
  writeQueue = task.catch(() => undefined);
  return task;
}

export { minNextBidCents, MIN_INCREMENT_CENTS };
