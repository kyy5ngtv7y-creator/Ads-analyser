import Link from "next/link";
import { PLANS } from "@/lib/billing/plans";

function Check() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden className="shrink-0">
      <path d="M3 8.5 6.5 12 13 4.5" stroke="#4ADE80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function LandingPage() {
  return (
    <div className="mx-auto max-w-[1200px] px-6">
      {/* Nav */}
      <nav className="flex items-center justify-between border-b border-line py-5">
        <div className="flex items-center gap-2.5">
          <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden>
            <rect x="1" y="1" width="24" height="24" rx="7" stroke="#C6F24E" strokeWidth="2" />
            <path d="M7 16.5 L11 9 L14.5 14 L19 7.5" stroke="#C6F24E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="font-display text-lg font-bold">Ads·Analyser</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="#funktionen" className="hidden text-[15px] font-medium text-muted hover:text-ink sm:block">
            Funktionen
          </a>
          <a href="#preise" className="hidden text-[15px] font-medium text-muted hover:text-ink sm:block">
            Preise
          </a>
          <Link
            href="/dashboard"
            className="rounded-lg bg-accent px-5 py-2.5 text-[15px] font-semibold text-accent-ink hover:opacity-90"
          >
            Gratis testen
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-start gap-10 py-16 lg:flex-row lg:items-center lg:gap-16 lg:py-24">
        <div className="flex flex-1 flex-col gap-6">
          <span className="inline-flex w-fit items-center rounded-full border border-accent/40 px-3.5 py-1.5 text-[13px] font-semibold text-accent">
            Für Meta &amp; TikTok Ads
          </span>
          <h1 className="font-display text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl xl:text-[56px]" style={{ textWrap: "balance" }}>
            Weiss in 60 Sekunden, ob deine Ad ein <span className="text-win">Winner</span> wird — oder{" "}
            <span className="text-flop">floppt</span>.
          </h1>
          <p className="max-w-[520px] text-lg leading-relaxed text-muted">
            Lade dein Creative und deine Copy hoch, bevor du Budget ausgibst. Du bekommst einen Winner-Score in Prozent,
            berechnet aus 8 festen Kriterien — plus konkrete Fixes und bessere Copy-Varianten.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/analyze" className="rounded-xl bg-accent px-7 py-4 text-[17px] font-semibold text-accent-ink hover:opacity-90">
              Ad jetzt gratis analysieren
            </Link>
            <span className="text-sm text-muted">3 Gratis-Analysen · 3 Tage voller Zugang · keine Kreditkarte</span>
          </div>
        </div>

        {/* Demo score card */}
        <div className="w-full max-w-[420px] rounded-2xl border border-line bg-surface p-7 shadow-[0_24px_80px_rgba(0,0,0,0.5)]">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-muted">summer-drop-video.mp4</span>
            <span className="rounded-full border border-line2 px-2.5 py-1 text-xs font-semibold text-muted">Meta · Cold · Sales</span>
          </div>
          <div className="flex justify-center py-3">
            <svg width="240" height="140" viewBox="0 0 240 140" aria-label="Winner-Score 78 Prozent">
              <path d="M 24 128 A 96 96 0 0 1 216 128" fill="none" stroke="#1A1F2B" strokeWidth="16" strokeLinecap="round" />
              <path d="M 24 128 A 96 96 0 0 1 216 128" fill="none" stroke="#4ADE80" strokeWidth="16" strokeLinecap="round" strokeDasharray="235 302" />
              <text x="120" y="106" textAnchor="middle" fill="#EAEEF6" fontSize="44" fontWeight="700" fontFamily="var(--font-display)">
                78%
              </text>
              <text x="120" y="130" textAnchor="middle" fill="#4ADE80" fontSize="14" fontWeight="600">
                WINNER-SCORE
              </text>
            </svg>
          </div>
          <div className="flex flex-col gap-2.5">
            {[
              ["Hook", 88, "#4ADE80"],
              ["Botschaft", 74, "#C6F24E"],
              ["CTA", 52, "#FBBF24"],
            ].map(([label, score, color]) => (
              <div key={label as string} className="flex items-center gap-3">
                <span className="w-[100px] text-[13px] text-muted">{label}</span>
                <div className="h-1.5 flex-1 rounded-full bg-surface2">
                  <div className="h-1.5 rounded-full" style={{ width: `${score}%`, background: color as string }} />
                </div>
                <span className="w-7 text-right text-[13px] font-semibold">{score}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-lg border border-warn/25 bg-warn/10 p-3.5 text-[13px] leading-relaxed text-[#B9C1D2]">
            <strong className="text-warn">Fix #1:</strong> Dein CTA passt nicht zum Sales-Ziel — „Mehr erfahren“ bremst den Kauf.
            Nutze „Jetzt shoppen“ + Angebot.
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="funktionen" className="flex flex-col gap-12 border-t border-line py-20">
        <div className="flex max-w-[640px] flex-col gap-3">
          <h2 className="font-display text-3xl font-bold">So funktioniert&rsquo;s</h2>
          <p className="text-[17px] leading-relaxed text-muted">
            Kein Rätselraten mehr, kein Budget-Verbrennen im Live-Test. Drei Schritte bis zur Entscheidung.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              title: "1 · Ad hochladen",
              text: "Bild oder Video plus Copy. Dazu dein Kontext: Plattform, Angebots-Typ, Preisklasse, Kampagnenziel, Funnel-Stufe und dein Wunschkunden-Profil.",
            },
            {
              title: "2 · Analyse nach 8 Kriterien",
              text: "Hook, Klarheit, Zielgruppen-Fit, Copywriting, CTA, Optik, Vertrauen, Policy-Risiko — gewichtet und transparent, kein Blackbox-Urteil.",
            },
            {
              title: "3 · Score + konkrete Fixes",
              text: "Winner-Score in Prozent, priorisierte Verbesserungen und fertig umgeschriebene Copy-Varianten. Schalten, verbessern oder verwerfen — du entscheidest informiert.",
            },
          ].map((item) => (
            <div key={item.title} className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-7">
              <h3 className="font-display text-xl font-semibold">{item.title}</h3>
              <p className="text-[15px] leading-relaxed text-muted">{item.text}</p>
            </div>
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {[
            {
              title: "Bewertet für deine Funnel-Stufe",
              text: "Cold Audience, Retargeting oder Bestandskunden — was bei Kaltakquise ein Muss ist, ist bei Käufern ein Fehler. Der Score kennt den Unterschied.",
            },
            {
              title: "Dein bester Käufer als Massstab",
              text: "Lege ein Profil deines Wunschkunden an — Pains, Wünsche, Einwände. Die Analyse prüft, ob deine Ad genau diesen Menschen trifft.",
            },
            {
              title: "Angle-Finder vor der Ad",
              text: "Noch keine Ad? Aus Produkt, Ziel und Wunschkunde generiert die Plattform 6 Marketing-Angles mit fertigen Hook-Ideen.",
            },
            {
              title: "Meta & TikTok — oder beides",
              text: "Jede Plattform hat eigene Regeln. Wähle beide und du bekommst zwei Scores nebeneinander — plus was du pro Plattform anpassen solltest.",
            },
          ].map((item) => (
            <div key={item.title} className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-8">
              <h3 className="font-display text-[22px] font-semibold">{item.title}</h3>
              <p className="text-[15px] leading-relaxed text-muted">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="preise" className="flex flex-col gap-10 border-t border-line py-20">
        <div className="flex flex-col items-center gap-3 text-center">
          <h2 className="font-display text-3xl font-bold">Erst ehrlich testen, dann entscheiden</h2>
          <p className="text-[17px] text-muted">3 Gratis-Analysen und 3 Tage voller Zugang — ohne Kreditkarte. Preise in CHF.</p>
        </div>
        <div className="grid items-stretch gap-6 md:grid-cols-3">
          {PLANS.map((plan) => {
            const highlight = plan.id === "pro";
            return (
              <div
                key={plan.id}
                className={`relative flex flex-col gap-4 rounded-2xl border p-8 ${
                  highlight ? "border-accent/50 bg-[#151B12]" : "border-line bg-surface"
                }`}
              >
                {highlight && (
                  <span className="absolute -top-3 left-8 rounded-full bg-accent px-3 py-1 text-xs font-bold tracking-wide text-accent-ink">
                    BESTER PREIS PRO ANALYSE
                  </span>
                )}
                <span className={`text-sm font-semibold tracking-wide ${highlight ? "text-accent" : "text-muted"}`}>
                  {plan.name.toUpperCase()}
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-[42px] font-bold">{plan.priceChf === 0 ? "0.–" : `${plan.priceChf}.–`}</span>
                  {plan.priceChf > 0 && <span className="text-[15px] text-muted">/Monat</span>}
                </div>
                <ul className="flex flex-col gap-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-[15px] text-[#B9C1D2]">
                      <Check />
                      {f}
                    </li>
                  ))}
                  {plan.perAnalysisChf !== null && (
                    <li className="flex items-center gap-2.5 text-[15px] text-[#B9C1D2]">
                      <Check />
                      <strong className={highlight ? "text-accent" : ""}>{plan.perAnalysisChf.toFixed(2)} pro Analyse</strong>
                    </li>
                  )}
                </ul>
                <Link
                  href="/dashboard"
                  className={`mt-auto rounded-lg py-3 text-center text-[15px] font-semibold ${
                    highlight ? "bg-accent text-accent-ink hover:opacity-90" : "border border-line2 text-ink hover:bg-surface2"
                  }`}
                >
                  {plan.id === "trial" ? "Gratis starten" : `${plan.name} wählen`}
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="flex flex-col items-center justify-between gap-4 border-t border-line py-8 text-sm text-faint sm:flex-row">
        <span>Ads·Analyser</span>
        <div className="flex gap-7">
          <span>Impressum</span>
          <span>Datenschutz</span>
          <span>AGB</span>
        </div>
      </footer>
    </div>
  );
}
