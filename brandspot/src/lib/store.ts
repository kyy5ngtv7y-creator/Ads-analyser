import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { rankBids, type Bid, type SpotState } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "spot.json");
// Obergrenze für gespeicherte Gebote: Beim Überschreiten fliegen die
// am niedrigsten platzierten Gebote raus (die Gesamtsumme bleibt erhalten).
const BIDS_LIMIT = 500;

const EMPTY_STATE: SpotState = {
  bids: [],
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
      bids: Array.isArray(parsed.bids) ? parsed.bids : [],
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

export type BidInput = {
  brand: string;
  message: string;
  url: string | null;
  imageUrl: string | null;
  color: string;
  amountCents: number;
};

export type ApplyResult = {
  bid: Bid;
  rank: number; // 1-basiert
  state: SpotState;
};

/**
 * Fügt ein Gebot der Rangliste hinzu. Jedes Gebot ab dem Mindestpreis
 * wird angenommen – der Betrag bestimmt nur die Platzierung, bei
 * Gleichstand gewinnt das frühere Gebot.
 */
export async function applyBid(input: BidInput): Promise<ApplyResult> {
  const task = writeQueue.then(async (): Promise<ApplyResult> => {
    const state = await readState();
    const bid: Bid = {
      id: randomUUID(),
      brand: input.brand,
      message: input.message,
      url: input.url,
      imageUrl: input.imageUrl,
      color: input.color,
      amountCents: input.amountCents,
      createdAt: new Date().toISOString(),
    };
    const ranked = rankBids([...state.bids, bid]).slice(0, BIDS_LIMIT);
    const next: SpotState = {
      bids: ranked,
      totalRaisedCents: state.totalRaisedCents + input.amountCents,
    };
    await writeState(next);
    const rank = ranked.findIndex((b) => b.id === bid.id) + 1;
    return { bid, rank: rank === 0 ? ranked.length + 1 : rank, state: next };
  });
  writeQueue = task.catch(() => undefined);
  return task;
}
