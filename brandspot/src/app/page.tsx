"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CATEGORIES,
  cleanUrl,
  formatUsd,
  listingKeyFor,
  type Bid,
  type Category,
  type LocationType,
  type PublicSpot,
} from "@/lib/types";

const LOCATION_OPTIONS: { value: LocationType; label: string }[] = [
  { value: "online", label: "Online" },
  { value: "physical", label: "Vor Ort" },
  { value: "both", label: "Beides" },
];

function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "gerade eben";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `vor ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `vor ${hours} h`;
  const days = Math.floor(hours / 24);
  return `vor ${days} d`;
}

function domainOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function headingOf(bid: Bid): string {
  return bid.title?.trim() ? bid.title : bid.brand;
}

function locationLine(bid: Bid): string {
  const parts: string[] = [];
  if (bid.locationType === "online") parts.push("Online");
  if (bid.locationType !== "online" && bid.address) parts.push(bid.address);
  if (bid.locationType === "both") parts.push("auch online");
  if (bid.country) parts.push(bid.country);
  return parts.join(" · ");
}

function formatCount(n: number): string {
  return n.toLocaleString("de-DE");
}

/** Verkleinert ein Bild clientseitig auf max. 256px Kante und liefert eine data-URI. */
async function fileToLogoDataUrl(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("decode failed"));
    el.src = dataUrl;
  });
  const max = 256;
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas failed");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/png");
}

function Avatar({ bid, size }: { bid: Bid; size: "lg" | "md" | "sm" }) {
  const cls =
    size === "lg"
      ? "h-14 w-14 rounded-2xl text-xl"
      : size === "md"
        ? "h-11 w-11 rounded-xl text-lg"
        : "h-8 w-8 rounded-lg text-sm";
  if (bid.logo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={bid.logo}
        alt=""
        className={`${cls} shrink-0 border border-stone-200 bg-white object-contain`}
      />
    );
  }
  return (
    <div
      className={`${cls} flex shrink-0 items-center justify-center border border-stone-200 bg-stone-100 font-bold text-stone-500`}
    >
      {bid.brand.slice(0, 1).toUpperCase()}
    </div>
  );
}

export default function Home() {
  const [spot, setSpot] = useState<PublicSpot | null>(null);
  const [filter, setFilter] = useState<"Alle" | Category>("Alle");
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [won, setWon] = useState<{
    rank: number;
    raised: boolean;
    paidCents: number;
  } | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);

  const [brand, setBrand] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState<Category>("Sonstiges");
  const [locationType, setLocationType] = useState<LocationType>("online");
  const [address, setAddress] = useState("");
  const [country, setCountry] = useState("");
  const [url, setUrl] = useState("");
  const [heroUrl, setHeroUrl] = useState("");
  const [logo, setLogo] = useState("");
  const [logoError, setLogoError] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const formRef = useRef<HTMLFormElement | null>(null);
  const clientIdRef = useRef<string>("");

  const load = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/spot?c=${encodeURIComponent(clientIdRef.current)}`,
        { cache: "no-store" }
      );
      if (!res.ok) return;
      const data: PublicSpot = await res.json();
      setSpot(data);
    } catch {
      // Netzwerkfehler still ignorieren, nächster Poll versucht es erneut
    }
  }, []);

  useEffect(() => {
    // Client-ID für den Online-Zähler, Besucher einmal pro Sitzung melden
    try {
      let id = sessionStorage.getItem("bs-client");
      if (!id) {
        id = Math.random().toString(36).slice(2) + Date.now().toString(36);
        sessionStorage.setItem("bs-client", id);
      }
      clientIdRef.current = id;
      if (!sessionStorage.getItem("bs-visited")) {
        sessionStorage.setItem("bs-visited", "1");
        fetch("/api/visit", { method: "POST" }).catch(() => {});
      }
    } catch {
      clientIdRef.current = "anon";
    }
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [load]);

  const minBid = spot?.minBidCents ?? 100;
  const toBeat = spot?.toBeatCents ?? 100;

  const amountCents = useMemo(() => {
    const value = Number(amount.replace(",", ".").trim());
    if (!amount.trim() || !Number.isFinite(value) || !Number.isInteger(value))
      return null;
    return value * 100;
  }, [amount]);

  // Bestehenden Eintrag zur eingegebenen Website (bzw. zum Brand-Namen)
  // finden – ein Gebot darauf erhöht den Eintrag, gezahlt wird die Differenz.
  const existingListing = useMemo(() => {
    const bids = spot?.bids ?? [];
    const cleaned = url.trim() ? cleanUrl(url.trim()) : null;
    if (!cleaned && !brand.trim()) return null;
    const key = listingKeyFor(cleaned, brand);
    const idx = bids.findIndex((b) => listingKeyFor(b.url, b.brand) === key);
    if (idx < 0) return null;
    return { bid: bids[idx], rank: idx + 1 };
  }, [spot, url, brand]);

  function openForm(prefillUrl?: string) {
    if (prefillUrl) setUrl(prefillUrl);
    setFormOpen(true);
    setError(null);
    setTimeout(
      () => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
      50
    );
  }

  async function onLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    setLogoError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setLogoError("Bitte wähle eine Bilddatei.");
      return;
    }
    try {
      const dataUrl = await fileToLogoDataUrl(file);
      if (dataUrl.length > 400_000) {
        setLogoError("Das Logo ist auch verkleinert noch zu groß.");
        return;
      }
      setLogo(dataUrl);
    } catch {
      setLogoError("Das Bild konnte nicht gelesen werden.");
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    if (amountCents === null) {
      setError("Gebote nur in ganzen Dollar – z.B. 5, nicht 4,50.");
      return;
    }
    if (amountCents < minBid) {
      setError(`Dein Gebot muss mindestens ${formatUsd(minBid)} sein.`);
      return;
    }
    if (existingListing && amountCents <= existingListing.bid.amountCents) {
      setError(
        `Dieser Eintrag steht schon bei ${formatUsd(existingListing.bid.amountCents)} – zum Erhöhen musst du mehr bieten.`
      );
      return;
    }
    if (locationType !== "online" && !address.trim()) {
      setError("Für einen physischen Ort brauchen wir eine Adresse.");
      return;
    }
    if (locationType !== "physical" && !url.trim()) {
      setError("Für eine Online-Brand brauchen wir eine Website.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/bid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand,
          title,
          message,
          category,
          locationType,
          address,
          country,
          url,
          logo,
          amountCents,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Etwas ist schiefgelaufen.");
        return;
      }
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      // Demo-Modus: Gebot ist sofort in der Rangliste
      setWon(
        typeof data.rank === "number"
          ? {
              rank: data.rank,
              raised: Boolean(data.raised),
              paidCents: typeof data.paidCents === "number" ? data.paidCents : 0,
            }
          : null
      );
      setFormOpen(false);
      setBrand("");
      setTitle("");
      setMessage("");
      setCategory("Sonstiges");
      setLocationType("online");
      setAddress("");
      setCountry("");
      setUrl("");
      setHeroUrl("");
      setLogo("");
      setAmount("");
      window.scrollTo({ top: 0, behavior: "smooth" });
      await load();
      setTimeout(() => setWon(null), 7000);
    } catch {
      setError("Verbindung fehlgeschlagen. Versuch es nochmal.");
    } finally {
      setSubmitting(false);
    }
  }

  const ranked = spot?.bids ?? [];
  const usedCategories = useMemo(() => {
    const set = new Set<Category>();
    ranked.forEach((b) => set.add(b.category ?? "Sonstiges"));
    return CATEGORIES.filter((c) => set.has(c));
  }, [ranked]);
  const visible =
    filter === "Alle"
      ? ranked
      : ranked.filter((b) => (b.category ?? "Sonstiges") === filter);
  // Kategorie-Sieger (für die "#1 in …"-Markierung) immer über alle Gebote
  const categoryLeaders = useMemo(() => {
    const map = new Map<Category, string>();
    ranked.forEach((b) => {
      const c = b.category ?? "Sonstiges";
      if (!map.has(c)) map.set(c, b.id);
    });
    return map;
  }, [ranked]);

  const top3 = visible.slice(0, 3);
  const rest = visible.slice(3);
  const totalClicks = ranked.reduce((sum, b) => sum + (b.clicks ?? 0), 0);
  const inputCls =
    "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 outline-none focus:border-orange-600";
  const labelCls = "mb-1 block text-sm text-stone-500";

  function metaLine(bid: Bid) {
    const isCatLeader = categoryLeaders.get(bid.category ?? "Sonstiges") === bid.id;
    return (
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500">
        {isCatLeader && (
          <span className="font-semibold text-orange-700">
            #1 in {bid.category ?? "Sonstiges"}
          </span>
        )}
        <span>{timeAgo(bid.createdAt)}</span>
        {domainOf(bid.url) && (
          <span className="font-medium text-stone-600">{domainOf(bid.url)}</span>
        )}
        <span className="font-medium text-stone-600">
          {formatCount(bid.clicks ?? 0)} Klicks
        </span>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 pb-24">
      {/* Header */}
      <header className="flex items-start justify-between py-5">
        <div className="text-xl font-extrabold tracking-tight">
          Brand<span className="text-orange-600">Spot</span>
        </div>
        <div className="text-right text-xs leading-5 text-stone-500">
          {spot && (
            <>
              <div>
                <span className="font-bold text-stone-900">{spot.online}</span>{" "}
                online ·{" "}
                <span className="font-bold text-stone-900">
                  {formatCount(spot.visitors)}
                </span>{" "}
                Besucher
              </div>
              <div>
                <span className="font-bold text-stone-900">
                  {formatUsd(spot.totalRaisedCents)}
                </span>{" "}
                geboten · {formatCount(totalClicks)} Klicks
                {spot.demoMode && (
                  <span className="ml-2 rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-bold text-orange-700">
                    Demo
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="pb-6 pt-4 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
          Sichere dir <span className="text-orange-600">Platz&nbsp;1</span>
          <br />
          für{" "}
          <span className="underline decoration-orange-400 decoration-4 underline-offset-4">
            {formatUsd(toBeat)}
          </span>
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm text-stone-500">
          Der Startpreis liegt bei <b className="text-stone-700">$1</b>, dein
          Gebot bestimmst du selbst. Wer weniger als Platz 1 bietet, landet
          trotzdem auf der Liste – genau auf dem Platz, den das Gebot hergibt.
        </p>

        <form
          className="mx-auto mt-6 flex max-w-md gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            openForm(heroUrl.trim());
          }}
        >
          <input
            value={heroUrl}
            onChange={(e) => setHeroUrl(e.target.value)}
            placeholder="https://deine-brand.com"
            className="min-w-0 flex-1 rounded-full border border-stone-300 bg-white px-5 py-3 text-sm outline-none focus:border-orange-600"
          />
          <button
            type="submit"
            className="rounded-full bg-orange-600 px-6 py-3 text-sm font-bold text-white shadow-md transition hover:bg-orange-500"
          >
            Mitbieten
          </button>
        </form>
      </section>

      {won !== null && (
        <div className="mb-4 rounded-xl border border-green-300 bg-green-50 p-4 text-center font-semibold text-green-700">
          {won.raised
            ? `Eintrag erhöht (${formatUsd(won.paidCents)} Differenz gezahlt) – du bist auf Platz ${won.rank}${won.rank === 1 ? " und hast den Spot." : "."}`
            : `Dein Gebot ist drin – du bist auf Platz ${won.rank}${won.rank === 1 ? " und hast den Spot." : "."}`}
        </div>
      )}

      {/* Formular */}
      {formOpen && (
        <form
          ref={formRef}
          onSubmit={submit}
          className="mb-8 space-y-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
        >
          <h2 className="text-center text-xl font-bold">
            Präsentiere deine Brand
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Brand-Name *</label>
              <input
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                maxLength={40}
                required
                placeholder="z.B. Acme GmbH"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Kategorie</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className={inputCls}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>
              Titel <span className="opacity-60">(wie er in der Liste steht, optional)</span>
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={70}
              placeholder="z.B. Acme – Werkzeuge für Profis"
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>
              Beschreibung * <span className="opacity-60">(max. 200 Zeichen)</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={200}
              required
              rows={2}
              placeholder="Was macht deine Brand? Was soll die Welt wissen?"
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Wo gibt es deine Brand? *</label>
            <div className="grid grid-cols-3 gap-2">
              {LOCATION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setLocationType(opt.value)}
                  className={`rounded-lg border px-2 py-2 text-sm font-semibold transition ${
                    locationType === opt.value
                      ? "border-orange-600 bg-orange-50 text-orange-700"
                      : "border-stone-300 text-stone-500 hover:text-stone-800"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {locationType !== "online" && (
            <div>
              <label className={labelCls}>Adresse *</label>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                maxLength={160}
                required
                placeholder="Straße Nr., PLZ Ort"
                className={inputCls}
              />
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Land</label>
              <input
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                maxLength={56}
                placeholder="z.B. Deutschland"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>
                Website {locationType !== "physical" ? "*" : "(optional)"}
              </label>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                type="url"
                required={locationType !== "physical"}
                placeholder="https://deine-brand.com"
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Logo (optional)</label>
            <div className="flex items-center gap-3">
              {logo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logo}
                  alt="Logo-Vorschau"
                  className="h-12 w-12 rounded-lg border border-stone-200 bg-white object-contain"
                />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={onLogoChange}
                className="block w-full text-sm text-stone-500 file:mr-3 file:rounded-full file:border-0 file:bg-stone-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-stone-700 hover:file:bg-stone-200"
              />
              {logo && (
                <button
                  type="button"
                  onClick={() => setLogo("")}
                  className="shrink-0 text-sm text-stone-400 hover:text-orange-700"
                >
                  Entfernen
                </button>
              )}
            </div>
            {logoError && <p className="mt-1 text-xs text-red-600">{logoError}</p>}
          </div>

          <div>
            <label className={labelCls}>
              Dein Gebot in $ *{" "}
              <span className="opacity-60">(ganze Dollar, frei wählbar)</span>
            </label>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="numeric"
              required
              placeholder={`mind. ${formatUsd(minBid).slice(1)}`}
              className={`${inputCls} text-lg font-bold`}
            />
          </div>
          {existingListing ? (
            <p className="rounded-lg bg-orange-50 p-3 text-xs text-orange-900">
              Diese {existingListing.bid.url ? "Website" : "Brand"} steht schon
              mit {formatUsd(existingListing.bid.amountCents)} auf Platz{" "}
              {existingListing.rank}. Dein Gebot <b>erhöht diesen Eintrag</b> –
              du zahlst nur die Differenz
              {amountCents !== null &&
              amountCents > existingListing.bid.amountCents
                ? ` (${formatUsd(amountCents - existingListing.bid.amountCents)})`
                : ""}
              . Niemand anderes kann deinen Eintrag übernehmen.
            </p>
          ) : (
            ranked.length > 0 && (
              <p className="text-xs text-stone-500">
                {amountCents !== null && amountCents >= toBeat
                  ? "Damit landest du auf Platz 1."
                  : `Für Platz 1 brauchst du mindestens ${formatUsd(toBeat)} – jedes Gebot ab ${formatUsd(minBid)} kommt trotzdem auf die Liste.`}
              </p>
            )
          )}

          {error && (
            <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-full bg-orange-600 px-6 py-3 font-bold text-white transition hover:bg-orange-500 disabled:opacity-50"
            >
              {submitting
                ? "Einen Moment…"
                : spot?.demoMode
                  ? "Gebot abgeben (Demo)"
                  : "Weiter zur Zahlung"}
            </button>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="rounded-full border border-stone-300 px-5 py-3 text-sm text-stone-500 hover:text-stone-800"
            >
              Abbrechen
            </button>
          </div>

          {spot?.demoMode && (
            <p className="text-center text-xs text-stone-400">
              Demo-Modus: keine echte Zahlung. Mit Stripe-Keys wird hier ein
              echter Checkout gestartet.
            </p>
          )}
        </form>
      )}

      {/* Kategorie-Filter */}
      {ranked.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-2">
          {(["Alle", ...usedCategories] as const).map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c as "Alle" | Category)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                filter === c
                  ? "bg-orange-600 text-white"
                  : "border border-stone-300 bg-white text-stone-500 hover:text-stone-900"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {/* Top 3 */}
      {top3.length > 0 && (
        <div className="space-y-3">
          {top3.map((b, i) => {
            const isFirst = i === 0;
            return (
              <article
                key={b.id}
                className={`rounded-2xl border bg-white ${
                  isFirst
                    ? "border-orange-300 bg-orange-50/60 p-6 shadow-sm"
                    : "border-orange-200/70 bg-orange-50/25 p-5"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex flex-col items-center gap-2">
                    <span
                      className={`flex items-center justify-center rounded-full font-extrabold text-white ${
                        isFirst
                          ? "h-9 w-9 bg-orange-600 text-sm"
                          : "h-8 w-8 bg-orange-400 text-xs"
                      }`}
                    >
                      #{i + 1}
                    </span>
                    <Avatar bid={b} size={isFirst ? "lg" : "md"} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <h3
                        className={`min-w-0 break-words font-extrabold leading-snug ${
                          isFirst ? "text-2xl" : "text-lg"
                        }`}
                      >
                        {b.url ? (
                          <a
                            href={`/go/${b.id}`}
                            target="_blank"
                            rel="noopener noreferrer nofollow"
                            className="hover:text-orange-700"
                          >
                            {headingOf(b)}
                          </a>
                        ) : (
                          headingOf(b)
                        )}
                      </h3>
                      <span
                        className={`shrink-0 font-extrabold tabular-nums text-orange-600 ${
                          isFirst ? "text-2xl" : "text-lg"
                        }`}
                      >
                        {formatUsd(b.amountCents)}
                      </span>
                    </div>
                    <p
                      className={`mt-1 break-words text-stone-600 ${
                        isFirst ? "text-sm" : "text-sm line-clamp-2"
                      }`}
                    >
                      {b.message}
                    </p>
                    <p className="mt-1 text-xs text-stone-500">
                      {locationLine(b)}
                    </p>
                    {metaLine(b)}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Rangliste ab Platz 4 */}
      {rest.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-2 text-lg font-bold text-stone-800">
            Die Rangliste
          </h2>
          <ol className="divide-y divide-stone-200">
            {rest.map((b, i) => (
              <li key={b.id} className="flex items-center gap-3 py-3">
                <span className="w-9 shrink-0 text-right text-sm font-bold text-stone-400">
                  #{i + 4}
                </span>
                <Avatar bid={b} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold">
                    {b.url ? (
                      <a
                        href={`/go/${b.id}`}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="hover:text-orange-700"
                      >
                        {headingOf(b)}
                      </a>
                    ) : (
                      headingOf(b)
                    )}
                  </div>
                  <div className="truncate text-xs text-stone-500">
                    {[domainOf(b.url), locationLine(b), `${formatCount(b.clicks ?? 0)} Klicks`]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-sm font-bold tabular-nums text-orange-600">
                    {formatUsd(b.amountCents)}
                  </div>
                  <div className="text-xs text-stone-400">{timeAgo(b.createdAt)}</div>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {ranked.length === 0 && (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center">
          <div className="text-2xl font-extrabold">Platz 1 ist noch frei.</div>
          <p className="mt-2 text-sm text-stone-500">
            Sei die erste Brand auf der Liste – für einen einzigen Dollar.
          </p>
          <button
            onClick={() => openForm()}
            className="mt-5 rounded-full bg-orange-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-orange-500"
          >
            Jetzt Platz 1 sichern
          </button>
        </div>
      )}

      {visible.length === 0 && ranked.length > 0 && (
        <p className="py-8 text-center text-sm text-stone-400">
          In dieser Kategorie gibt es noch keine Gebote.
        </p>
      )}

      <footer className="mt-16 text-center text-xs text-stone-400">
        <button
          onClick={() => setRulesOpen(true)}
          className="font-semibold text-stone-500 underline underline-offset-2 hover:text-stone-800"
        >
          Regeln
        </button>
      </footer>

      {rulesOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setRulesOpen(false)}
        >
          <div
            className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 text-left shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xl font-extrabold">Regeln</h2>
              <button
                onClick={() => setRulesOpen(false)}
                aria-label="Schließen"
                className="text-stone-400 hover:text-stone-800"
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-stone-600">
              BrandSpot ist eine öffentliche Rangliste. Du zahlst, um über
              allen anderen zu stehen. Der Rang ist das Gebot – sonst nichts.
            </p>
            <h3 className="mt-4 font-bold">So funktioniert die Rangliste</h3>
            <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-stone-600">
              <li>Gebote sind ganze US-Dollar, Startpreis $1 – die Höhe bestimmst du selbst.</li>
              <li>
                Wer weniger als Platz 1 zahlt, landet trotzdem auf der Liste –
                genau auf dem Platz, den das Gebot hergibt.
              </li>
              <li>
                Dieselbe Website erneut eintragen erhöht diesen Eintrag – du
                zahlst nur die Differenz zum aktuellen Gebot. Niemand anderes
                kann deinen Eintrag übernehmen, indem er die Differenz zahlt.
              </li>
              <li>
                Bei gleichem Betrag steht vorne, wer ihn zuerst erreicht hat.
              </li>
            </ul>
            <h3 className="mt-4 font-bold">Was du eintragen kannst</h3>
            <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-stone-600">
              <li>
                Deine Brand – online (mit Website), vor Ort (mit Adresse) oder
                beides. Mit Titel, Beschreibung, Land, Kategorie und Logo.
              </li>
              <li>
                Chat- und Invite-Links sind nicht erlaubt – Telegram, WhatsApp,
                Discord, Messenger, Signal und ähnliche. Die Liste ist für
                Brands, nicht für Gruppenchats.
              </li>
              <li>
                Query-Parameter werden aus Links entfernt – Affiliate-,
                Referral- und Tracking-URLs funktionieren nicht.
              </li>
            </ul>
            <h3 className="mt-4 font-bold">Nach der Zahlung</h3>
            <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-stone-600">
              <li>
                Dein Eintrag ist öffentlich, Klicks werden gezählt und gehen
                zur eingereichten URL – ohne Query-Parameter.
              </li>
              <li>Erst die abgeschlossene Zahlung sichert den Rang.</li>
            </ul>
          </div>
        </div>
      )}
    </main>
  );
}
