"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, VerdictBadge } from "@/components/ui";
import { getAnalyses, type StoredAnalysis } from "@/lib/store";
import type { FunnelStage, Platform } from "@/lib/types";

export default function HistoryPage() {
  const [analyses, setAnalyses] = useState<StoredAnalysis[]>([]);
  const [platformFilter, setPlatformFilter] = useState<Platform | "">("");
  const [funnelFilter, setFunnelFilter] = useState<FunnelStage | "">("");

  useEffect(() => setAnalyses(getAnalyses()), []);

  const filtered = analyses.filter(
    (a) =>
      (!platformFilter || a.input.platforms.includes(platformFilter)) &&
      (!funnelFilter || a.input.funnelStage === funnelFilter)
  );

  const selectCls =
    "rounded-lg border border-line2 bg-surface px-3 py-2 text-sm text-ink focus:border-accent/60 focus:outline-none";

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-[26px] font-bold">Historie</h1>
          <p className="text-[15px] text-muted">{analyses.length} Analysen, lokal in deinem Browser gespeichert.</p>
        </div>
        <div className="flex gap-2.5">
          <select className={selectCls} value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value as Platform | "")}>
            <option value="">Alle Plattformen</option>
            <option value="meta">Meta</option>
            <option value="tiktok">TikTok</option>
          </select>
          <select className={selectCls} value={funnelFilter} onChange={(e) => setFunnelFilter(e.target.value as FunnelStage | "")}>
            <option value="">Alle Funnel-Stufen</option>
            <option value="cold">Cold</option>
            <option value="retargeting">Retargeting</option>
            <option value="customers">Bestandskunden</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-10 text-center text-[15px] text-muted">
          Keine Analysen gefunden. <Link href="/analyze" className="text-accent-text">Starte eine neue Analyse</Link>.
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((a) => {
            const best = a.results.reduce((acc, r) => (r.totalScore > acc.totalScore ? r : acc), a.results[0]);
            return (
              <Link key={a.id} href={`/analysis/${a.id}`}>
                <Card className="flex h-full flex-col gap-3 p-5 transition-colors hover:bg-surface2">
                  {a.input.creativePreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.input.creativePreview} alt="" className="h-32 w-full rounded-lg border border-line object-cover" />
                  ) : (
                    <div className="flex h-32 items-center justify-center rounded-lg border border-line bg-surface2 text-[13px] text-faint">
                      Nur Copy
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[15px] font-semibold">{a.input.projectName}</span>
                    <VerdictBadge verdict={best.verdict} score={best.totalScore} />
                  </div>
                  <span className="text-[13px] text-muted">
                    {a.input.platforms.map((p) => (p === "meta" ? "Meta" : "TikTok")).join(" + ")} ·{" "}
                    {{ cold: "Cold", retargeting: "Retargeting", customers: "Bestandskunden" }[a.input.funnelStage]} ·{" "}
                    {new Date(a.createdAt).toLocaleDateString("de-CH")}
                  </span>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
