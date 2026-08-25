import Link from "next/link";

export default function SuccessPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-4 text-center">
      <div className="text-6xl">🎉</div>
      <h1 className="mt-6 text-4xl font-black tracking-tight">
        Zahlung erfolgreich!
      </h1>
      <p className="mt-4 text-zinc-400">
        Sobald Stripe die Zahlung bestätigt hat (dauert meist nur Sekunden),
        steht deine Brand in der Rangliste – je höher dein Gebot, desto weiter
        oben. Bei gleichem Betrag zählt, wer zuerst geboten hat.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-full bg-amber-400 px-8 py-4 text-lg font-black text-zinc-950 transition hover:bg-amber-300"
      >
        Zur Rangliste →
      </Link>
    </main>
  );
}
