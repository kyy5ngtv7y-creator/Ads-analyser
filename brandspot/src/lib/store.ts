import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import {
  listingKeyFor,
  rankBids,
  START_PRICE_CENTS,
  type Bid,
  type Category,
  type LocationType,
  type SpotState,
} from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "spot.json");
const PENDING_FILE = path.join(DATA_DIR, "pending.json");
// Obergrenze für gespeicherte Gebote: Beim Überschreiten fliegen die
// am niedrigsten platzierten Gebote raus (die Gesamtsumme bleibt erhalten).
const BIDS_LIMIT = 500;
// Unbezahlte Checkout-Sessions verfallen nach 24 h.
const PENDING_TTL_MS = 24 * 60 * 60 * 1000;

const EMPTY_STATE: SpotState = {
  bids: [],
  totalRaisedCents: 0,
};

// Serialisiert alle Schreibzugriffe innerhalb dieses Prozesses,
// damit zwei gleichzeitige Gebote sich nicht gegenseitig überschreiben.
let writeQueue: Promise<unknown> = Promise.resolve();

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const task = writeQueue.then(fn);
  writeQueue = task.catch(() => undefined);
  return task;
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(file: string, value: unknown): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${file}.${randomUUID()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(value, null, 2), "utf8");
  await fs.rename(tmp, file);
}

async function readState(): Promise<SpotState> {
  const parsed = await readJson<SpotState>(DATA_FILE, EMPTY_STATE);
  if (typeof parsed !== "object" || parsed === null) return { ...EMPTY_STATE };
  return {
    bids: Array.isArray(parsed.bids) ? parsed.bids : [],
    totalRaisedCents:
      typeof parsed.totalRaisedCents === "number" ? parsed.totalRaisedCents : 0,
  };
}

export async function getSpotState(): Promise<SpotState> {
  return readState();
}

export type BidInput = {
  brand: string;
  message: string;
  category: Category;
  locationType: LocationType;
  address: string | null;
  country: string | null;
  url: string | null;
  logo: string | null;
  color: string;
  amountCents: number;
};

export type ApplyResult =
  | {
      ok: true;
      bid: Bid;
      rank: number; // 1-basiert
      raised: boolean; // true = bestehender Eintrag wurde erhöht
      paidCents: number; // gezahlter Betrag (bei Erhöhung nur die Differenz)
      state: SpotState;
    }
  | { ok: false; reason: "raise_too_low"; currentCents: number };

/**
 * Fügt ein Gebot der Rangliste hinzu oder erhöht einen bestehenden
 * Eintrag: Einträge sind über ihre Website (bzw. den Brand-Namen)
 * verknüpft – dieselbe Website erneut einzutragen setzt das Gebot des
 * Eintrags auf den neuen Betrag, gezahlt wird nur die Differenz.
 * Niemand anderes kann einen Eintrag übernehmen: Jede andere Website
 * ist ein eigener Eintrag. Der Betrag bestimmt die Platzierung, bei
 * Gleichstand steht vorne, wer den Betrag zuerst erreicht hat.
 */
export async function applyBid(input: BidInput): Promise<ApplyResult> {
  return enqueue(async () => {
    const state = await readState();
    const key = listingKeyFor(input.url, input.brand);
    const existing = state.bids.find(
      (b) => listingKeyFor(b.url, b.brand) === key
    );

    if (existing && input.amountCents <= existing.amountCents) {
      return {
        ok: false,
        reason: "raise_too_low",
        currentCents: existing.amountCents,
      };
    }

    const paidCents = existing
      ? input.amountCents - existing.amountCents
      : input.amountCents;
    const bid: Bid = {
      id: existing ? existing.id : randomUUID(),
      ...input,
      // Bei einer Erhöhung zählt für den Gleichstand der Zeitpunkt,
      // zu dem der neue Betrag erreicht wurde.
      createdAt: new Date().toISOString(),
    };
    const others = existing
      ? state.bids.filter((b) => b.id !== existing.id)
      : state.bids;
    const ranked = rankBids([...others, bid]).slice(0, BIDS_LIMIT);
    const next: SpotState = {
      bids: ranked,
      totalRaisedCents: state.totalRaisedCents + paidCents,
    };
    await writeState(next);
    const rank = ranked.findIndex((b) => b.id === bid.id) + 1;
    return {
      ok: true,
      bid,
      rank: rank === 0 ? ranked.length + 1 : rank,
      raised: Boolean(existing),
      paidCents,
      state: next,
    };
  });
}

/** Aktueller Stand eines Eintrags zu einer Website / einem Brand-Namen. */
export async function findListing(
  url: string | null,
  brand: string
): Promise<Bid | null> {
  const state = await readState();
  const key = listingKeyFor(url, brand);
  return (
    state.bids.find((b) => listingKeyFor(b.url, b.brand) === key) ?? null
  );
}

export { START_PRICE_CENTS };

async function writeState(state: SpotState): Promise<void> {
  await writeJson(DATA_FILE, state);
}

// --- Ausstehende Stripe-Gebote ---
// Logo-Uploads (data-URIs) passen nicht in Stripe-Metadata (max. 500 Zeichen
// pro Wert), daher wird das komplette Gebot serverseitig geparkt und der
// Checkout-Session nur ein Token mitgegeben.

type PendingMap = Record<string, { input: BidInput; createdAt: string }>;

function prunePending(map: PendingMap): PendingMap {
  const cutoff = Date.now() - PENDING_TTL_MS;
  const next: PendingMap = {};
  for (const [token, entry] of Object.entries(map)) {
    if (new Date(entry.createdAt).getTime() >= cutoff) next[token] = entry;
  }
  return next;
}

export async function addPendingBid(input: BidInput): Promise<string> {
  return enqueue(async () => {
    const token = randomUUID();
    const map = prunePending(await readJson<PendingMap>(PENDING_FILE, {}));
    map[token] = { input, createdAt: new Date().toISOString() };
    await writeJson(PENDING_FILE, map);
    return token;
  });
}

export async function takePendingBid(token: string): Promise<BidInput | null> {
  return enqueue(async () => {
    const map = prunePending(await readJson<PendingMap>(PENDING_FILE, {}));
    const entry = map[token];
    if (!entry) return null;
    delete map[token];
    await writeJson(PENDING_FILE, map);
    return entry.input;
  });
}
