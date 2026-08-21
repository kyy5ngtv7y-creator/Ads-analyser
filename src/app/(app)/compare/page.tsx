"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, ScoreBar, VerdictBadge, scoreColor } from "@/components/ui";
import { CRITERIA } from "@/lib/scoring/framework";
import { getAnalyses, type StoredAnalysis } from "@/lib/store";

export default function ComparePage() {
  const [analyses, setAnalyses] = useState<StoredAnalysis[]>([]);
  const [leftId, setLeftId] = useState("");
  const [rightId, setRightId] = useState("");

  useEffect(() => {
    const all = getAnalyses();
    setAnalyses(all);
    if (all.length >= 2) {
      setLeftId(all[0].id);
      setRightId(all[1].id);
    }
  }, []);

  const left = analyses.find((a) => a.id === leftId);
  const right = analyses.find((a) => a.id === rightId);

  const selectCls =
    "w-full rounded-lg border border-line2 bg-surface px-3 py-2.5 text-sm text-ink focus:border-accent/60 focus:outline-none";

  const label = (a: StoredAnalysis) =>
    `${a.input.projectName} · ${new Date(a.createdAt).toLocaleDateString("de-CH")} · ${Math.max(...a.results.map((r) => r.totalScore))}%`;

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-10">
      <div>
        <h1 className="font-display text-[26px] font-bold">A/B-Vergleich</h1>
        <p className="text-[15px] text-muted">Zwei Ad-Varianten nebeneinander — welche gewinnt auf welchem Kriterium?</p>
      </div>

      {analyses.length < 2 ? (
        <Card className="p-10 text-center text-[15px] text-muted">
          Du brauchst mindestens zwei Analysen. <Link href="/analyze" className="text-accent">Analysiere eine zweite Variante</Link>.
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <select className={selectCls} value={leftId} onChange={(e) => setLeftId(e.target.value)}>
              {analyses.map((a) => (
                <option key={a.id} value={a.id}>
                  A: {label(a)}
                </option>
              ))}
            </select>
            <select className={selectCls} value={rightId} onChange={(e) => setRightId(e.target.value)}>
              {analyses.map((a) => (
                <option key={a.id} value={a.id}>
                  B: {label(a)}
                </option>
              ))}
            </select>
          </div>

          {left && right && (
            <div className="grid gap-5 md:grid-cols-2">
              {[left, right].map((a, idx) => {
                const best = a.results.reduce((acc, r) => (r.totalScore > acc.totalScore ? r : acc), a.results[0]);
                const other = idx === 0 ? right : left;
                const otherBest = other.results.reduce((acc, r) => (r.totalScore > acc.totalScore ? r : acc), other.results[0]);
                return (
                  <Card key={a.id} className={`flex flex-col gap-4 p-6 ${best.totalScore >= otherBest.totalScore ? "border-accent/40" : ""}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-display text-lg font-semibold">Variante {idx === 0 ? "A" : "B"}</span>
                      <VerdictBadge verdict={best.verdict} score={best.totalScore} />
                    </div>
                    {a.input.creativePreview && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.input.creativePreview} alt="" className="h-36 w-full rounded-lg border border-line object-cover" />
                    )}
                    <div className="flex flex-col gap-3">
                      {best.criteria.map((c) => {
                        const otherScore = otherBest.criteria.find((x) => x.key === c.key)?.score ?? 0;
                        const wins = c.score > otherScore;
                        return (
                          <div key={c.key} className="flex items-center gap-3">
                            <span className={`w-[190px] shrink-0 text-[13px] ${wins ? "font-semibold text-ink" : "text-muted"}`}>
                              {CRITERIA.find((x) => x.key === c.key)?.label}
                              {wins && " ✓"}
                            </span>
                            <div className="min-w-0 flex-1">
                              <ScoreBar score={c.score} />
                            </div>
                            <span className="w-8 shrink-0 text-right text-[13px] font-bold" style={{ color: scoreColor(c.score) }}>
                              {c.score}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <Link href={`/analysis/${a.id}`} className="text-sm text-accent hover:opacity-80">
                      Details ansehen →
                    </Link>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
