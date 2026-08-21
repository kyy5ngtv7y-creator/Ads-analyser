"use client";

// E-Mail-Gate über dem Detail-Report: Score ist sichtbar (Wow-Moment),
// Kriterien/Fixes/Rewrites schalten sich per E-Mail frei.

import { useState } from "react";
import { PrimaryButton, inputCls } from "@/components/ui";
import { saveLead } from "@/lib/store";

export default function ReportGate({ children, locked, onUnlock }: { children: React.ReactNode; locked: boolean; onUnlock: () => void }) {
  const [email, setEmail] = useState("");
  const emailValid = /.+@.+\..+/.test(email);

  if (!locked) return <>{children}</>;

  return (
    <div className="relative">
      <div className="pointer-events-none select-none blur-[7px]" aria-hidden>
        {children}
      </div>
      <div className="absolute inset-0 flex items-start justify-center pt-10">
        <div className="sticky top-24 flex w-full max-w-[460px] flex-col gap-4 rounded-2xl border border-line2 bg-elevated p-7 text-center shadow-[var(--modal-shadow)]">
          <h3 className="font-display text-[20px] font-bold">Den vollen Report freischalten</h3>
          <p className="text-[14px] leading-relaxed text-muted">
            Alle 8 Kriterien mit Begründung, priorisierte Fixes und fertige Copy-Rewrites — gratis. Wohin sollen wir den Report schicken?
          </p>
          <input
            className={inputCls}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="du@firma.ch"
            onKeyDown={(e) => {
              if (e.key === "Enter" && emailValid) {
                saveLead({ email: email.trim(), source: "report_gate" });
                onUnlock();
              }
            }}
          />
          <PrimaryButton
            disabled={!emailValid}
            onClick={() => {
              saveLead({ email: email.trim(), source: "report_gate" });
              onUnlock();
            }}
          >
            Report anzeigen →
          </PrimaryButton>
          <span className="text-[12px] text-faint">Kein Spam. Deine 2 weiteren Gratis-Analysen bleiben erhalten.</span>
        </div>
      </div>
    </div>
  );
}
