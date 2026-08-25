"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatUsd, type PublicSpot, type Takeover } from "@/lib/types";

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

export default function Home() {
  const [spot, setSpot] = useState<PublicSpot | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justWon, setJustWon] = useState(false);

  const [brand, setBrand] = useState("");
  const [message, setMessage] = useState("");
  const [url, setUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
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
        setAmount(String(data.minNextBidCents / 100));
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

  const minNext = spot?.minNextBidCents ?? 100;

  const amountCents = useMemo(() => {
    const normalized = amount.replace(",", ".");
    const value = Number(normalized);
    if (!Number.isFinite(value)) return null;
    return Math.round(value * 100);
  }, [amount]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    if (amountCents === null || amountCents < minNext) {
      setError(`Dein Gebot muss mindestens ${formatUsd(minNext)} sein.`);
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
          url,
          imageUrl,
          color,
          amountCents,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Etwas ist schiefgelaufen.");
        if (data.minNextBidCents) {
          amountTouched.current = false;
          setAmount(String(data.minNextBidCents / 100));
        }
        return;
      }
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      // Demo-Modus: sofort übernommen
      setJustWon(true);
      setFormOpen(false);
      amountTouched.current = false;
      setBrand("");
      setMessage("");
      setUrl("");
      setImageUrl("");
      await load();
      setTimeout(() => setJustWon(false), 5000);
    } catch {
      setError("Verbindung fehlgeschlagen. Versuch es nochmal.");
    } finally {
      setSubmitting(false);
    }
  }

  const current = spot?.current ?? null;
  const cardColor = current?.color ?? "#1f2937";
  const cardText = textOn(cardColor);

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
                {spot.history.length + (spot.current ? 1 : 0)} Übernahmen
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
        Ein einziger Werbeplatz. Er gehört der Brand, die zuletzt am meisten
        gezahlt hat – bis jemand mehr bietet. Startpreis:{" "}
        <span className="font-semibold text-zinc-200">$1</span>.
      </p>

      {justWon && (
        <div className="mb-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-center font-semibold text-emerald-300">
          🎉 Der Spot gehört jetzt dir – bis dich jemand überbietet!
        </div>
      )}

      {/* Der Spot */}
      <section
        className="spot-card rounded-3xl p-8 text-center shadow-2xl sm:p-12"
        style={{ backgroundColor: cardColor, color: cardText }}
      >
        {current ? (
          <>
            <div className="text-xs font-semibold uppercase tracking-widest opacity-70">
              Dieser Spot gehört gerade
            </div>
            {current.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={current.imageUrl}
                alt={current.brand}
                className="mx-auto mt-6 h-24 w-24 rounded-2xl object-cover shadow-lg"
              />
            )}
            <h1 className="mt-4 break-words text-5xl font-black tracking-tight sm:text-6xl">
              {current.brand}
            </h1>
            <p className="mx-auto mt-4 max-w-md break-words text-lg opacity-90">
              {current.message}
            </p>
            {current.url && (
              <a
                href={current.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="mt-6 inline-block rounded-full px-6 py-2.5 text-sm font-bold shadow"
                style={{ backgroundColor: cardText, color: cardColor }}
              >
                Zur Brand →
              </a>
            )}
            <div className="mt-8 text-sm opacity-70">
              hat {formatUsd(current.amountCents)} gezahlt ·{" "}
              {timeAgo(current.createdAt)}
            </div>
          </>
        ) : (
          <>
            <div className="text-xs font-semibold uppercase tracking-widest opacity-70">
              Dieser Spot ist noch frei
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
          <button
            onClick={() => {
              setFormOpen(true);
              setError(null);
            }}
            className="rounded-full bg-amber-400 px-8 py-4 text-lg font-black text-zinc-950 shadow-lg transition hover:scale-105 hover:bg-amber-300"
          >
            {current
              ? `Spot klauen für ${formatUsd(minNext)}`
              : `Spot sichern für ${formatUsd(minNext)}`}
          </button>
        ) : (
          <form
            onSubmit={submit}
            className="mx-auto max-w-md space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 text-left"
          >
            <h2 className="text-center text-xl font-bold">
              Übernimm den Spot
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
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-zinc-400">
                Deine Botschaft * <span className="opacity-60">(max. 140 Zeichen)</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={140}
                required
                rows={2}
                placeholder="Was soll die Welt über deine Brand wissen?"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-zinc-400">
                Link zu deiner Seite (optional)
              </label>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                type="url"
                placeholder="https://deine-brand.com"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-zinc-400">
                Logo-URL (optional)
              </label>
              <input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                type="url"
                placeholder="https://…/logo.png"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 outline-none focus:border-amber-400"
              />
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
                Dein Gebot in $ * <span className="opacity-60">(mind. {formatUsd(minNext)})</span>
              </label>
              <input
                value={amount}
                onChange={(e) => {
                  amountTouched.current = true;
                  setAmount(e.target.value);
                }}
                inputMode="decimal"
                required
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-lg font-bold outline-none focus:border-amber-400"
              />
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
                    ? "Spot übernehmen (Demo)"
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

      {/* So funktioniert's */}
      <section className="mt-16 grid gap-4 text-center sm:grid-cols-3">
        {[
          ["1", "Biete mehr", "Zahl mindestens $1 mehr als die aktuelle Brand."],
          ["2", "Gehör dir", "Deine Brand, deine Botschaft, deine Farbe – sofort live."],
          ["3", "Bis…", "…dich die nächste Brand überbietet. So einfach ist das."],
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

      {/* Historie */}
      {spot && spot.history.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-4 text-center text-lg font-bold text-zinc-300">
            Frühere Besitzer
          </h2>
          <ul className="space-y-2">
            {spot.history.map((t: Takeover) => (
              <li
                key={t.id}
                className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: t.color }}
                  />
                  <span className="truncate font-semibold">{t.brand}</span>
                  <span className="hidden truncate text-sm text-zinc-500 sm:inline">
                    {t.message}
                  </span>
                </div>
                <div className="ml-3 shrink-0 text-right text-sm">
                  <div className="font-bold">{formatUsd(t.amountCents)}</div>
                  <div className="text-xs text-zinc-500">{timeAgo(t.createdAt)}</div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="mt-20 text-center text-xs text-zinc-600">
        BrandSpot – inspiriert von outbid.lol. Wer zahlt, gewinnt. Vorerst.
      </footer>
    </main>
  );
}
