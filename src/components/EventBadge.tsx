"use client";

import { forwardRef, useState } from "react";
import type { RegistrationView } from "@/lib/types";

type EventBadgeProps = {
  registration: RegistrationView;
  qrDataUrl: string;
};

const EventBadge = forwardRef<HTMLDivElement, EventBadgeProps>(function EventBadge(
  { registration, qrDataUrl },
  ref,
) {
  const [logoUnavailable, setLogoUnavailable] = useState(false);
  const isVip = registration.badgeType === "vip";
  const nameFontSize = Math.max(4.3, Math.min(7.1, 690 / Math.max(registration.fullName.length, 1)));

  return (
    <article
      ref={ref}
      className={`badge-card${isVip ? " badge-card-vip" : ""}`}
      aria-label={`Badge ${isVip ? "VIP" : "Standard"} de ${registration.fullName}`}
      data-event-badge
    >
      <div className="badge-frame-inner" aria-hidden="true" />
      <svg className="badge-curve badge-curve-top" viewBox="0 0 920 340" fill="none" aria-hidden="true">
        <path d="M-52 221C154 64 316 12 526 100C663 157 763 197 981 27" stroke="currentColor" strokeWidth="2" />
        <path d="M-47 267C155 114 332 64 535 146C686 207 798 236 987 85" stroke="currentColor" strokeWidth="1" />
      </svg>
      <svg className="badge-curve badge-curve-bottom" viewBox="0 0 920 320" fill="none" aria-hidden="true">
        <path d="M-30 300C172 133 351 78 535 153C701 221 795 254 972 101" stroke="currentColor" strokeWidth="2" />
        <path d="M-26 344C177 185 356 126 548 201C703 262 816 292 978 154" stroke="currentColor" strokeWidth="1" />
      </svg>

      <div className="badge-brand-lockup">
        {!logoUnavailable ? (
          <img
            className="badge-logo-image"
            src="/assets/logo.png"
            alt="Logo WOMEN INCREASE INTERNATIONAL"
            onError={() => setLogoUnavailable(true)}
          />
        ) : (
          <span className="badge-logo-monogram" aria-hidden="true">W</span>
        )}
        <div className="badge-organization">
          <strong>WOMEN INCREASE</strong>
          <span>INTERNATIONAL</span>
        </div>
      </div>

      <div className="badge-event-title">
        <p className="badge-eyebrow">CONFÉRENCE ANNUELLE · 2026</p>
        <h2>Femmes Épanouies,<br /><em>Femme d’Impact</em></h2>
        <p className="badge-theme">Briser les malédictions du mariage !</p>
      </div>

      <div className="badge-confirmation">
        <span className="badge-confirmation-dot" /> INSCRIPTION CONFIRMÉE
      </div>

      <div className="badge-participant">
        <p className="badge-small-label">CE BADGE EST AU NOM DE</p>
        <h3 style={{ fontSize: `${nameFontSize}cqw` }}>{registration.fullName}</h3>
      </div>

      <div className="badge-tier-line">
        <span className={`badge-tier${isVip ? " badge-tier-vip" : ""}`}>
          {isVip ? "VIP" : "STANDARD"}
        </span>
        <span className="badge-amount">
          {registration.amount.toLocaleString("fr-FR")} <small>FCFA</small>
        </span>
      </div>

      <div className="badge-qr-shell">
        {qrDataUrl ? (
          <img className="badge-qr-image" src={qrDataUrl} alt={`QR code du badge ${registration.qrCode}`} />
        ) : (
          <div className="badge-qr-loading" aria-label="QR code en préparation" />
        )}
      </div>
      <p className="badge-code-label">CODE D’INSCRIPTION</p>
      <p className="badge-code">{registration.qrCode}</p>

      <div className="badge-event-details">
        <span className="badge-event-date">05 DÉCEMBRE 2026 <i /> DÈS 10H00</span>
        <span className="badge-event-place">XAVIERA HOTEL · Carrefour Tropicana, Yaoundé</span>
      </div>

      <div className="badge-footer">
        <span>PRÉSENTEZ CE BADGE À L’ENTRÉE</span>
        <span className="badge-footer-ornament" aria-hidden="true">✦</span>
      </div>
    </article>
  );
});

export default EventBadge;
