"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  formatUsd,
  type Bid,
  type LocationType,
  type PublicSpot,
} from "@/lib/types";

const COLORS = [
  "#e11d48",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#111827",
];

const LOCATION_OPTIONS: { value: LocationType; label: string }[] = [
  { value: "online", label: "🌐 Online" },
  { value: "physical", label: "📍 Vor Ort" },
  { value: "both", label: "🌐+📍 Beides" },
];

function textOn(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#0a0a0f" : "#ffffff";
}

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

function locationLine(bid: Bid): string {
  const parts: string[] = [];
  if (bid.locationType === "online") parts.push("🌐 Online");
  if (bid.locationType !== "online" && bid.address) parts.push(`📍 ${bid.address}`);
  if (bid.locationType === "both") parts.push("🌐 auch online");
  if (bid.country) parts.push(bid.country);
  return parts.join(" · ");
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

export default function Home() {
  const [spot, setSpot] = useState<PublicSpot | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wonRank, setWonRank] = useState<number | null>(null);

  const [brand, setBrand] = useState("");
  const [message, setMessage] = useState("");
  const [locationType, setLocationType] = useState<LocationType>("online");
  const [address, setAddress] = useState("");
  const [country, setCountry] = useState("");
  const [url, setUrl] = useState("");
  const [logo, setLogo] = useState("");
  const [logoError, setLogoError] = useState<string | null>(null);
  const [color, setColor] = useState(COLORS[5]);
  const [amount, setAmount] = useState("");
  const amountTouched = useRef(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/spot", { cache: "no-store" });
      if (!res.ok) return;
      const data: PublicSpot = await res.json();
      setSpot(data);
      if (!amountTouched.current) {
        setAmount(String(data.toBeatCents / 100));
      }
    } catch {
      // Netzwerkfehler still ignorieren, nächster Poll versucht es erneut
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [load]);

  const minBid = spot?.minBidCents ?? 100;
  const toBeat = spot?.toBeatCents ?? 100;

  const amountCents = useMemo(() => {
    const normalized = amount.replace(",", ".");
    const value = Number(normalized);
    if (!Number.isFinite(value)) return null;
    return Math.round(value * 100);
  }, [amount]);

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

    if (amountCents === null || amountCents < minBid) {
      setError(`Dein Gebot muss mindestens ${formatUsd(minBid)} sein.`);
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
          message,
          locationType,
          address,
          country,
          url,
          logo,
          color,
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
      setWonRank(typeof data.rank === "number" ? data.rank : null);
      setFormOpen(false);
      amountTouched.current = false;
      setBrand("");
      setMessage("");
      setAddress("");
      setCountry("");
      setUrl("");
      setLogo("");
      await load();
      setTimeout(() => setWonRank(null), 6000);
    } catch {
      setError("Verbindung fehlgeschlagen. Versuch es nochmal.");
    } finally {
      setSubmitting(false);
    }
  }

  const ranked = spot?.bids ?? [];
  const top = ranked[0] ?? null;
  const rest = ranked.slice(1);
  const cardColor = top?.color ?? "#1f2937";
  const cardText = textOn(cardColor);
  const inputCls =
    "w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 outline-none focus:border-amber-400";

  return (
    <main className="mx-auto max-w-3xl px-4 pb-24">
      {/* Header */}
      <header className="flex items-center justify-between py-6">
        <div className="text-xl font-black tracking-tight">
          Brand<span className="text-amber-400">Spot</span>
        </div>
        <div className="text-right text-sm text-zinc-400">
          {spot && (
            <>
              <div>
                <span className="font-bold text-zinc-100">
                  {formatUsd(spot.totalRaisedCents)}
                </span>{" "}
                insgesamt geboten
              </div>
              <div>
                {ranked.length} {ranked.length === 1 ? "Gebot" : "Gebote"}
                {spot.demoMode && (
                  <span className="ml-2 rounded bg-amber-400/15 px-1.5 py-0.5 text-xs font-semibold text-amber-300">
                    Demo-Modus
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </header>

      {/* Intro */}
      <p className="mb-6 text-center text-sm text-zinc-400">
        Jedes Gebot ab{" "}
        <span className="font-semibold text-zinc-200">$1</span> kommt in die
        Rangliste. Wer am meisten bietet, bekommt den großen Spot – bei
        gleichem Betrag gewinnt, wer{" "}
        <span className="font-semibold text-zinc-200">zuerst</span> geboten hat.
      </p>

      {wonRank !== null && (
        <div className="mb-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-center font-semibold text-emerald-300">
          🎉 Dein Gebot ist drin – du bist auf{" "}
          <span className="font-black">Platz {wonRank}</span>
          {wonRank === 1 ? " und hast den Spot!" : "!"}
        </div>
      )}

      {/* Platz 1: Der Spot */}
      <section
        className="spot-card relative rounded-3xl p-8 text-center shadow-2xl sm:p-12"
        style={{ backgroundColor: cardColor, color: cardText }}
      >
        {top ? (
          <>
            <div className="absolute left-4 top-4 rounded-full bg-black/20 px-3 py-1 text-sm font-black">
              #1
            </div>
            <div className="text-xs font-semibold uppercase tracking-widest opacity-70">
              Platz 1 gehört gerade
            </div>
            {top.logo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={top.logo}
                alt={top.brand}
                className="mx-auto mt-6 h-24 w-24 rounded-2xl bg-white/10 object-contain shadow-lg"
              />
            )}
            <h1 className="mt-4 break-words text-5xl font-black tracking-tight sm:text-6xl">
              {top.brand}
            </h1>
            <p className="mx-auto mt-4 max-w-md break-words text-lg opacity-90">
              {top.message}
            </p>
            <div className="mt-4 text-sm font-semibold opacity-80">
              {locationLine(top)}
            </div>
            {top.url && (
              <a
                href={top.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="mt-5 inline-block rounded-full px-6 py-2.5 text-sm font-bold shadow"
                style={{ backgroundColor: cardText, color: cardColor }}
              >
                Zur Website →
              </a>
            )}
            <div className="mt-8 text-sm opacity-70">
              hat {formatUsd(top.amountCents)} geboten · {timeAgo(top.createdAt)}
            </div>
          </>
        ) : (
          <>
            <div className="text-xs font-semibold uppercase tracking-widest opacity-70">
              Platz 1 ist noch frei
            </div>
            <h1 className="mt-4 text-5xl font-black tracking-tight sm:text-6xl">
              Deine Brand hier.
            </h1>
            <p className="mx-auto mt-4 max-w-md text-lg opacity-90">
              Sei die erste Brand auf dem Spot – für einen einzigen Dollar.
            </p>
          </>
        )}
      </section>

      {/* CTA */}
      <div className="mt-8 text-center">
        {!formOpen ? (
          <>
            <button
              onClick={() => {
                setFormOpen(true);
                setError(null);
              }}
              className="rounded-full bg-amber-400 px-8 py-4 text-lg font-black text-zinc-950 shadow-lg transition hover:scale-105 hover:bg-amber-300"
            >
              Mitbieten ab {formatUsd(minBid)}
            </button>
            {top && (
              <p className="mt-3 text-sm text-zinc-500">
                Ab {formatUsd(toBeat)} bist du auf Platz 1.
              </p>
            )}
          </>
        ) : (
          <form
            onSubmit={submit}
            className="mx-auto max-w-md space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 text-left"
          >
            <h2 className="text-center text-xl font-bold">
              Präsentiere deine Brand
            </h2>

            <div>
              <label className="mb-1 block text-sm text-zinc-400">
                Brand-Name *
              </label>
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
              <label className="mb-1 block text-sm text-zinc-400">
                Beschreibung *{" "}
                <span className="opacity-60">(max. 200 Zeichen)</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={200}
                required
                rows={3}
                placeholder="Was macht deine Brand? Was soll die Welt wissen?"
                className={inputCls}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-zinc-400">
                Wo gibt es deine Brand? *
              </label>
              <div className="grid grid-cols-3 gap-2">
                {LOCATION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setLocationType(opt.value)}
                    className={`rounded-lg border px-2 py-2 text-sm font-semibold transition ${
                      locationType === opt.value
                        ? "border-amber-400 bg-amber-400/10 text-amber-300"
                        : "border-zinc-700 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {locationType !== "online" && (
              <div>
                <label className="mb-1 block text-sm text-zinc-400">
                  Adresse *
                </label>
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

            <div>
              <label className="mb-1 block text-sm text-zinc-400">Land</label>
              <input
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                maxLength={56}
                placeholder="z.B. Deutschland"
                className={inputCls}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-zinc-400">
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

            <div>
              <label className="mb-1 block text-sm text-zinc-400">
                Logo (optional)
              </label>
              <div className="flex items-center gap-3">
                {logo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logo}
                    alt="Logo-Vorschau"
                    className="h-12 w-12 rounded-lg bg-white/10 object-contain"
                  />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={onLogoChange}
                  className="block w-full text-sm text-zinc-400 file:mr-3 file:rounded-full file:border-0 file:bg-zinc-800 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-zinc-200 hover:file:bg-zinc-700"
                />
                {logo && (
                  <button
                    type="button"
                    onClick={() => setLogo("")}
                    className="shrink-0 text-sm text-zinc-500 hover:text-rose-400"
                  >
                    Entfernen
                  </button>
                )}
              </div>
              {logoError && (
                <p className="mt-1 text-xs text-rose-400">{logoError}</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm text-zinc-400">
                Spot-Farbe
              </label>
              <div className="flex gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    aria-label={`Farbe ${c}`}
                    className={`h-8 w-8 rounded-full transition ${
                      color === c
                        ? "ring-2 ring-amber-400 ring-offset-2 ring-offset-zinc-900"
                        : "opacity-70 hover:opacity-100"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm text-zinc-400">
                Dein Gebot in $ *{" "}
                <span className="opacity-60">(mind. {formatUsd(minBid)})</span>
              </label>
              <input
                value={amount}
                onChange={(e) => {
                  amountTouched.current = true;
                  setAmount(e.target.value);
                }}
                inputMode="decimal"
                required
                className={`${inputCls} text-lg font-bold`}
              />
              {top && (
                <p className="mt-1 text-xs text-zinc-500">
                  {amountCents !== null && amountCents >= toBeat
                    ? "Damit landest du auf Platz 1. 🏆"
                    : `Für Platz 1 brauchst du mindestens ${formatUsd(toBeat)} – jedes Gebot ab ${formatUsd(minBid)} kommt trotzdem in die Rangliste.`}
                </p>
              )}
            </div>

            {error && (
              <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-300">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 rounded-full bg-amber-400 px-6 py-3 font-black text-zinc-950 transition hover:bg-amber-300 disabled:opacity-50"
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
                className="rounded-full border border-zinc-700 px-5 py-3 text-sm text-zinc-400 hover:text-zinc-200"
              >
                Abbrechen
              </button>
            </div>

            {spot?.demoMode && (
              <p className="text-center text-xs text-zinc-500">
                Demo-Modus: keine echte Zahlung. Mit Stripe-Keys wird hier ein
                echter Checkout gestartet.
              </p>
            )}
          </form>
        )}
      </div>

      {/* Rangliste ab Platz 2 */}
      {rest.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-4 text-center text-lg font-bold text-zinc-300">
            Die Rangliste
          </h2>
          <ul className="space-y-2">
            {rest.map((b: Bid, i: number) => (
              <li
                key={b.id}
                className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="w-8 shrink-0 text-right font-black text-zinc-500">
                    #{i + 2}
                  </span>
                  {b.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={b.logo}
                      alt=""
                      className="h-8 w-8 shrink-0 rounded-lg bg-white/10 object-contain"
                    />
                  ) : (
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: b.color }}
                    />
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {b.url ? (
                        <a
                          href={b.url}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="truncate font-semibold hover:text-amber-300"
                        >
                          {b.brand}
                        </a>
                      ) : (
                        <span className="truncate font-semibold">{b.brand}</span>
                      )}
                    </div>
                    <div className="truncate text-xs text-zinc-500">
                      {locationLine(b) || b.message}
                    </div>
                  </div>
                </div>
                <div className="ml-3 shrink-0 text-right text-sm">
                  <div className="font-bold">{formatUsd(b.amountCents)}</div>
                  <div className="text-xs text-zinc-500">{timeAgo(b.createdAt)}</div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* So funktioniert's */}
      <section className="mt-16 grid gap-4 text-center sm:grid-cols-3">
        {[
          ["1", "Biete ab $1", "Jedes Gebot kommt in die Rangliste – egal wie hoch."],
          ["2", "Mehr = weiter oben", "Der höchste Betrag bekommt den großen Spot ganz oben."],
          ["3", "Schnell sein lohnt sich", "Bei gleichem Betrag steht vorne, wer zuerst geboten hat."],
        ].map(([n, title, text]) => (
          <div key={n} className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
            <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-amber-400 font-black text-zinc-950">
              {n}
            </div>
            <div className="font-bold">{title}</div>
            <div className="mt-1 text-sm text-zinc-400">{text}</div>
          </div>
        ))}
      </section>

      <footer className="mt-20 text-center text-xs text-zinc-600">
        BrandSpot – inspiriert von outbid.lol. Wer mehr bietet, steht oben.
      </footer>
    </main>
  );
}
