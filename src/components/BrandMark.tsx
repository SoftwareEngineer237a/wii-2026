"use client";

import { useState } from "react";

type BrandMarkProps = {
  compact?: boolean;
  light?: boolean;
};

export default function BrandMark({ compact = false, light = false }: BrandMarkProps) {
  const [logoUnavailable, setLogoUnavailable] = useState(false);

  return (
    <span className={`brand-mark${compact ? " brand-mark-compact" : ""}${light ? " brand-mark-light" : ""}`}>
      {!logoUnavailable ? (
        <img
          className="brand-mark-logo"
          src="/assets/logo.png"
          alt=""
          onError={() => setLogoUnavailable(true)}
        />
      ) : (
        <span className="brand-mark-monogram" aria-hidden="true">W</span>
      )}
      <span className="brand-mark-copy">
        <strong>WOMEN INCREASE</strong>
        <span>INTERNATIONAL</span>
      </span>
    </span>
  );
}
