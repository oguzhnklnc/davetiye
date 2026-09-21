"use client";

import { useEffect, useState } from "react";

type Remaining = { days: number; hours: number; minutes: number; seconds: number };

function getRemaining(target: string): Remaining {
  const distance = Math.max(0, new Date(target).getTime() - Date.now());
  return {
    days: Math.floor(distance / 86_400_000),
    hours: Math.floor((distance / 3_600_000) % 24),
    minutes: Math.floor((distance / 60_000) % 60),
    seconds: Math.floor((distance / 1_000) % 60),
  };
}

export function Countdown({ target }: { target: string }) {
  const [remaining, setRemaining] = useState<Remaining>(() => getRemaining(target));

  useEffect(() => {
    const timer = window.setInterval(() => setRemaining(getRemaining(target)), 1000);
    return () => window.clearInterval(timer);
  }, [target]);

  const values = [
    [remaining.days, "Gün"],
    [remaining.hours, "Saat"],
    [remaining.minutes, "Dakika"],
    [remaining.seconds, "Saniye"],
  ] as const;

  return (
    <div className="countdown" role="timer" aria-label="Düğüne kalan süre" aria-live="off">
      {values.map(([value, label]) => (
        <div className="countdown-item" key={label}>
          <strong>{String(value).padStart(2, "0")}</strong>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}
