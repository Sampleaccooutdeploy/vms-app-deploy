"use client";

import { useEffect, useState } from "react";
import styles from "./Preloader.module.css";

/**
 * LogoPreloader – replicates the Framer LogoPreloader animation.
 *
 * Phases:
 *   init     → logo 80 px below centre, opacity 0
 *   loading  → logo slides to centre, opacity 1
 *   logoOut  → logo slides 80 px above, opacity 0, background fades
 *   done     → removed from DOM
 */
export default function Preloader({ duration = 2 }: { duration?: number }) {
  const [phase, setPhase] = useState<"init" | "loading" | "logoOut" | "done">("init");

  useEffect(() => {
    // kick off the "loading" phase almost immediately
    const t0 = setTimeout(() => setPhase("loading"), 50);

    // after the visible duration, start the exit animation
    const t1 = setTimeout(() => setPhase("logoOut"), duration * 1000 + 50);

    // after exit animation finishes, remove from DOM
    const t2 = setTimeout(() => setPhase("done"), duration * 1000 + 750);

    return () => {
      clearTimeout(t0);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [duration]);

  if (phase === "done") return null;

  /* ---------- per-phase style values ---------- */
  let logoTranslateY = 0;
  let logoOpacity = 1;

  if (phase === "init") {
    logoTranslateY = 80;
    logoOpacity = 0;
  } else if (phase === "loading") {
    logoTranslateY = 0;
    logoOpacity = 1;
  } else if (phase === "logoOut") {
    logoTranslateY = -80;
    logoOpacity = 0;
  }

  const bgOpacity = phase === "logoOut" ? 0 : 1;

  return (
    <div
      className={styles.overlay}
      style={{ opacity: bgOpacity }}
      aria-label="Loading"
      role="status"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/login.png"
        alt="SCSVMV Logo"
        className={styles.logo}
        style={{
          transform: `translateY(${logoTranslateY}px)`,
          opacity: logoOpacity,
        }}
        draggable={false}
      />
    </div>
  );
}
