"use client";

import { useRef, useState, type FormEvent } from "react";
import QRCode from "qrcode";
import BrandMark from "@/components/BrandMark";
import EventBadge from "@/components/EventBadge";
import { downloadBadge } from "@/lib/download-badge";
import type { BadgeType, RegistrationView } from "@/lib/types";

type FormValues = {
  fullName: string;
  phone: string;
  email: string;
  badgeType: BadgeType;
};

const initialForm: FormValues = { fullName: "", phone: "", email: "", badgeType: "standard" };
const qrOptions = {
  errorCorrectionLevel: "H" as const,
  margin: 4,
  width: 720,
  color: { dark: "#171017", light: "#fffaf1" },
};

function Icon({ name }: { name: "calendar" | "pin" | "spark" | "shield" }) {
  const paths = {
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
    pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    spark: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-2-5.8L4 11l6-2.2L12 3Z" /><path d="m19 15 .9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z" /></>,
    shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-4" /></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export default function HomePage() {
  const [form, setForm] = useState<FormValues>(initialForm);
  const [registration, setRegistration] = useState<RegistrationView | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const badgeRef = useRef<HTMLDivElement>(null);

  async function submitRegistration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        registration?: RegistrationView;
        error?: string;
      };
      if (!response.ok || !payload.registration) {
        throw new Error(payload.error || "L’inscription n’a pas pu être enregistrée. Réessayez.");
      }

      setRegistration(payload.registration);
      const qr = await QRCode.toDataURL(payload.registration.qrCode, qrOptions);
      setQrDataUrl(qr);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Une erreur réseau est survenue. Réessayez.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload() {
    if (!badgeRef.current || !registration || !qrDataUrl || downloading) return;
    setDownloading(true);
    setError("");
    try {
      await downloadBadge(badgeRef.current, registration.fullName);
    } catch {
      setError("Le téléchargement du badge a échoué. Réessayez depuis un navigateur récent.");
    } finally {
      setDownloading(false);
    }
  }

  function registerAnother() {
    setRegistration(null);
    setQrDataUrl("");
    setForm(initialForm);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="public-page">
      <header className="site-header">
        <a className="header-brand" href="/" aria-label="WOMEN INCREASE INTERNATIONAL, accueil">
          <BrandMark />
        </a>
        <div className="header-right">
          <span className="header-event-date">05 DÉCEMBRE 2026</span>
          <a className="committee-link" href="/admin">Espace comité <span aria-hidden="true">↗</span></a>
        </div>
      </header>

      <main className="landing-layout">
        <section className="event-intro" aria-labelledby="event-heading">
          <div className="intro-decoration intro-decoration-one" aria-hidden="true" />
          <div className="intro-decoration intro-decoration-two" aria-hidden="true" />
          <p className="eyebrow"><span className="eyebrow-line" /> CONFÉRENCE ANNUELLE · YAOUNDÉ · 2026</p>
          <h1 id="event-heading">Femmes Épanouies,<br /><em>Femme d’Impact</em></h1>
          <p className="event-theme">« Briser les malédictions du mariage ! »</p>
          <div className="intro-rule" />
          <div className="speaker-block">
            <span className="speaker-kicker">AVEC LA</span>
            <span className="speaker-name">Révérende Archange BAYONG</span>
            <span className="speaker-program">Formation sur le numérique, les réseaux sociaux<br className="desktop-break" /> et l’entrepreneuriat</span>
          </div>

          <div className="event-facts">
            <div className="event-fact">
              <span className="fact-icon"><Icon name="calendar" /></span>
              <span><strong>05 décembre 2026</strong><small>Dès 10h00</small></span>
            </div>
            <div className="event-fact">
              <span className="fact-icon"><Icon name="pin" /></span>
              <span><strong>XAVIERA HOTEL</strong><small>Carrefour Tropicana, Yaoundé</small></span>
            </div>
          </div>

          <div className="offline-note">
            <span className="offline-note-icon"><Icon name="shield" /></span>
            <p>Les billets physiques restent disponibles et sont vérifiés à vue. Le paiement du badge numérique se fait en dehors de cette application ; la preuve est transmise au comité via WhatsApp.</p>
          </div>
        </section>

        <section className="registration-column" aria-label="Inscription et badge numérique">
          {!registration ? (
            <div className="registration-card">
              <div className="form-card-heading">
                <span className="form-kicker"><Icon name="spark" /> BADGE NUMÉRIQUE</span>
                <h2>Inscrire une participante</h2>
                <p>Renseignez ses coordonnées et choisissez son badge.</p>
              </div>

              <form className="registration-form" onSubmit={submitRegistration}>
                <label className="field-label" htmlFor="full-name">Nom complet <span>*</span></label>
                <input
                  className="text-input"
                  id="full-name"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  placeholder="Ex. Mireille Fonkém"
                  maxLength={120}
                  value={form.fullName}
                  onChange={(event) => setForm({ ...form, fullName: event.target.value })}
                  required
                />

                <label className="field-label" htmlFor="phone">Numéro de téléphone <span>*</span></label>
                <input
                  className="text-input"
                  id="phone"
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="Ex. +237 6 70 00 00 00"
                  maxLength={32}
                  value={form.phone}
                  onChange={(event) => setForm({ ...form, phone: event.target.value })}
                  required
                />

                <label className="field-label" htmlFor="email">Adresse email <span>*</span></label>
                <input
                  className="text-input"
                  id="email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="nom@exemple.com"
                  maxLength={254}
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                  required
                />

                <fieldset className="badge-options">
                  <legend className="field-label">Type de badge <span>*</span></legend>
                  <div className="badge-option-grid">
                    <label className={`badge-option${form.badgeType === "standard" ? " badge-option-selected" : ""}`}>
                      <input
                        type="radio"
                        name="badgeType"
                        value="standard"
                        checked={form.badgeType === "standard"}
                        onChange={() => setForm({ ...form, badgeType: "standard" })}
                      />
                      <span className="option-name">STANDARD</span>
                      <span className="option-price">2 000 <small>FCFA</small></span>
                    </label>
                    <label className={`badge-option badge-option-vip${form.badgeType === "vip" ? " badge-option-selected" : ""}`}>
                      <input
                        type="radio"
                        name="badgeType"
                        value="vip"
                        checked={form.badgeType === "vip"}
                        onChange={() => setForm({ ...form, badgeType: "vip" })}
                      />
                      <span className="option-name">VIP <span className="vip-spark">✦</span></span>
                      <span className="option-price">5 000 <small>FCFA</small></span>
                    </label>
                  </div>
                </fieldset>

                {error && <p className="form-error" role="alert">{error}</p>}
                <button className="primary-button generate-button" type="submit" disabled={loading}>
                  {loading ? <><span className="button-spinner" /> Enregistrement…</> : <>Générer le badge <span aria-hidden="true">→</span></>}
                </button>
                <p className="payment-footnote">Aucun paiement en ligne. Le comité enregistre la participante après réception de sa preuve de paiement sur WhatsApp.</p>
              </form>
            </div>
          ) : (
            <div className="badge-result-card">
              <div className="result-heading">
                <span className="result-success-icon"><Icon name="shield" /></span>
                <div><h2>Badge prêt à être envoyé</h2><p>Inscription enregistrée avec succès.</p></div>
              </div>
              <div className="badge-preview-wrap">
                <EventBadge ref={badgeRef} registration={registration} qrDataUrl={qrDataUrl} />
              </div>
              {error && <p className="form-error result-error" role="alert">{error}</p>}
              <div className="result-actions">
                <button className="primary-button" type="button" disabled={!qrDataUrl || downloading} onClick={handleDownload}>
                  {downloading ? <><span className="button-spinner" /> Préparation du PNG…</> : <>Télécharger mon badge <span aria-hidden="true">↓</span></>}
                </button>
                <button className="secondary-button" type="button" onClick={registerAnother}>Enregistrer une autre participante</button>
              </div>
            </div>
          )}
        </section>
      </main>

      <footer className="site-footer">
        <BrandMark compact />
        <span>Femmes Épanouies, Femme d’Impact <i>·</i> Yaoundé 2026</span>
      </footer>
    </div>
  );
}
