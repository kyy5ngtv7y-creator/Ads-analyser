"use client";

// Kleine UI-Bausteine im Cockpit-Stil.

import type { Verdict } from "@/lib/types";
import { VERDICT_META } from "@/lib/scoring/framework";

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-line bg-surface ${className}`}>{children}</div>;
}

export function verdictColor(verdict: Verdict): string {
  return { winner: "#4ADE80", solid: "#C6F24E", risky: "#FBBF24", flop: "#F87171" }[verdict];
}

export function scoreColor(score: number): string {
  if (score >= 75) return "#4ADE80";
  if (score >= 55) return "#C6F24E";
  if (score >= 35) return "#FBBF24";
  return "#F87171";
}

export function VerdictBadge({ verdict, score }: { verdict: Verdict; score?: number }) {
  const color = verdictColor(verdict);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-semibold"
      style={{ background: `${color}1f`, color }}
    >
      {score !== undefined && <>{score}%&nbsp;</>}
      {VERDICT_META[verdict].label}
    </span>
  );
}

export function ScoreBar({ score }: { score: number }) {
  return (
    <div className="h-2 w-full rounded-full bg-surface2">
      <div className="h-2 rounded-full" style={{ width: `${score}%`, background: scoreColor(score) }} />
    </div>
  );
}

export function ScoreGauge({ score, label = "Winner-Score", size = 280 }: { score: number; label?: string; size?: number }) {
  const color = scoreColor(score);
  const r = size * 0.4;
  const cx = size / 2;
  const cy = size * 0.53;
  const arcLen = Math.PI * r;
  const h = size * 0.62;
  return (
    <svg width={size} height={h} viewBox={`0 0 ${size} ${h}`} role="img" aria-label={`${label}: ${score}%`}>
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none"
        stroke="#1A1F2B"
        strokeWidth={size * 0.065}
        strokeLinecap="round"
      />
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none"
        stroke={color}
        strokeWidth={size * 0.065}
        strokeLinecap="round"
        strokeDasharray={`${(arcLen * score) / 100} ${arcLen + 10}`}
      />
      <text x={cx} y={cy - size * 0.09} textAnchor="middle" fill="#EAEEF6" fontSize={size * 0.19} fontWeight={700} fontFamily="var(--font-display)">
        {score}%
      </text>
      <text x={cx} y={cy} textAnchor="middle" fill="#8A93A6" fontSize={size * 0.048}>
        {label}
      </text>
    </svg>
  );
}

export function OptionCard({
  active,
  onClick,
  title,
  description,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  description: string;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[44px] flex-1 flex-col gap-1.5 rounded-xl border p-4 text-left transition-colors ${
        active ? "border-accent/60 bg-[#151B12]" : "border-line2 bg-surface hover:border-line2 hover:bg-surface2"
      }`}
    >
      <span className="flex items-center justify-between">
        <span className="font-display text-[15px] font-semibold">{title}</span>
        {badge && <span className="text-[11px] font-semibold text-faint">{badge}</span>}
        {active && (
          <svg width="18" height="18" viewBox="0 0 22 22" fill="none" aria-hidden>
            <circle cx="11" cy="11" r="10" fill="#C6F24E" />
            <path d="M6.5 11.5 9.5 14.5 15.5 8" stroke="#101503" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span className="text-[13px] leading-relaxed text-muted">{description}</span>
    </button>
  );
}

export function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[44px] rounded-full border px-4 text-[14px] font-medium transition-colors ${
        active ? "border-accent bg-accent font-semibold text-accent-ink" : "border-line2 text-muted hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-semibold text-muted">{label}</span>
      {children}
      {hint && <span className="text-[12px] text-faint">{hint}</span>}
    </label>
  );
}

export const inputCls =
  "w-full rounded-lg border border-line2 bg-surface px-3.5 py-2.5 text-[15px] text-ink placeholder:text-faint focus:border-accent/60 focus:outline-none";

export function PrimaryButton({
  children,
  onClick,
  disabled,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-accent px-5 text-[15px] font-semibold text-accent-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

export function GhostButton({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-line2 px-5 text-[15px] font-medium text-ink transition-colors hover:bg-surface2 disabled:opacity-40"
    >
      {children}
    </button>
  );
}
