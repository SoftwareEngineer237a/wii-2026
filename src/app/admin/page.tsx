"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import QRCode from "qrcode";
import BrandMark from "@/components/BrandMark";
import EventBadge from "@/components/EventBadge";
import ScannerModal from "@/components/ScannerModal";
import { downloadBadge } from "@/lib/download-badge";
import type { BadgeType, RegistrationStats, RegistrationView } from "@/lib/types";

type PageView = "checking" | "login" | "dashboard" | "error";
type FilterType = "all" | BadgeType;

const qrOptions = {
  errorCorrectionLevel: "H" as const,
  margin: 4,
  width: 720,
  color: { dark: "#171017", light: "#fffaf1" },
};
const emptyStats: RegistrationStats = { total: 0, standard: 0, vip: 0 };

function formatAmount(amount: number) {
  return `${amount.toLocaleString("fr-FR")} FCFA`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function BadgePill({ type }: { type: BadgeType }) {
  return <span className={`badge-pill${type === "vip" ? " badge-pill-vip" : ""}`}>{type === "vip" ? "VIP" : "STANDARD"}</span>;
}

function StatIcon({ type }: { type: "people" | "standard" | "vip" }) {
  if (type === "people") {
    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20v-1.5A4.5 4.5 0 0 1 7 14h4a4.5 4.5 0 0 1 4.5 4.5V20M16 4.8a3.5 3.5 0 0 1 0 6.5M18 14h.5a3.5 3.5 0 0 1 3.5 3.5V20" /></svg>;
  }
  if (type === "vip") {
    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m12 3 2.3 5.2L20 10l-5.7 1.8L12 17l-2.3-5.2L4 10l5.7-1.8L12 3Z" /><path d="m19 16 .9 2.1L22 19l-2.1.9L19 22l-.9-2.1L16 19l2.1-.9L19 16Z" /></svg>;
  }
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16v14H4zM8 3v8m8-8v8M4 12h16" /></svg>;
}

export default function AdminPage() {
  const [view, setView] = useState<PageView>("checking");
  const [pin, setPin] = useState("");
  const [loginError, setLoginError] = useState("");
  const [dashboardError, setDashboardError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [registrationsList, setRegistrationsList] = useState<RegistrationView[]>([]);
  const [stats, setStats] = useState<RegistrationStats>(emptyStats);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [selected, setSelected] = useState<RegistrationView | null>(null);
  const [detailQr, setDetailQr] = useState("");
  const [detailQrError, setDetailQrError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const badgeRef = useRef<HTMLDivElement>(null);
  const selectedIdRef = useRef<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setDashboardError("");
    try {
      const response = await fetch("/api/list", { cache: "no-store" });
      const payload = (await response.json().catch(() => ({}))) as {
        registrations?: RegistrationView[];
        stats?: RegistrationStats;
        error?: string;
      };
      if (response.status === 401) {
        setView("login");
        return;
      }
      if (!response.ok || !payload.registrations || !payload.stats) {
        throw new Error(payload.error || "Le tableau de bord est indisponible.");
      }
      setRegistrationsList(payload.registrations);
      setStats(payload.stats);
      setView("dashboard");
    } catch (caught) {
      setDashboardError(caught instanceof Error ? caught.message : "Impossible de joindre le serveur.");
      setView("error");
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loggingIn) return;
    setLoggingIn(true);
    setLoginError("");
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Connexion impossible. Réessayez.");
      setPin("");
      setView("checking");
      await loadDashboard();
    } catch (caught) {
      setLoginError(caught instanceof Error ? caught.message : "Connexion impossible. Vérifiez le réseau.");
    } finally {
      setLoggingIn(false);
    }
  }

  async function logout() {
    try {
      await fetch("/api/logout", { method: "POST" });
    } finally {
      setRegistrationsList([]);
      setStats(emptyStats);
      setScannerOpen(false);
      setSelected(null);
      setView("login");
    }
  }

  async function openDetails(registration: RegistrationView) {
    selectedIdRef.current = registration.id;
    setSelected(registration);
    setDetailQr("");
    setDetailQrError("");
    try {
      const dataUrl = await QRCode.toDataURL(registration.qrCode, qrOptions);
      if (selectedIdRef.current === registration.id) setDetailQr(dataUrl);
    } catch {
      if (selectedIdRef.current === registration.id) setDetailQrError("Le QR code de ce badge n’a pas pu être généré.");
    }
  }

  function closeDetails() {
    selectedIdRef.current = null;
    setSelected(null);
    setDetailQr("");
    setDetailQrError("");
  }

  async function downloadSelectedBadge() {
    if (!badgeRef.current || !selected || !detailQr || downloading) return;
    setDownloading(true);
    try {
      await downloadBadge(badgeRef.current, selected.fullName);
    } catch {
      setDetailQrError("Le téléchargement du PNG a échoué. Réessayez.");
    } finally {
      setDownloading(false);
    }
  }

  const filteredRegistrations = registrationsList.filter((registration) => {
    const searchValue = search.trim().toLocaleLowerCase("fr-FR");
    const matchesSearch = !searchValue ||
      registration.fullName.toLocaleLowerCase("fr-FR").includes(searchValue) ||
      registration.phone.toLocaleLowerCase("fr-FR").includes(searchValue);
    const matchesType = filterType === "all" || registration.badgeType === filterType;
    return matchesSearch && matchesType;
  });

  if (view === "checking") {
    return <main className="admin-gate"><div className="admin-loading-card"><span className="button-spinner" /><p>Vérification de la session…</p></div></main>;
  }

  if (view === "error") {
    return (
      <main className="admin-gate">
        <section className="admin-login-card admin-error-card">
          <BrandMark />
          <p className="admin-eyebrow">ESPACE COMITÉ</p>
          <h1>Connexion indisponible</h1>
          <p className="admin-login-description">{dashboardError}</p>
          <button className="primary-button" type="button" onClick={() => { setView("checking"); void loadDashboard(); }}>Réessayer</button>
          <a className="back-home-link" href="/">Retour à l’inscription</a>
        </section>
      </main>
    );
  }

  if (view === "login") {
    return (
      <main className="admin-gate">
        <div className="gate-decoration gate-decoration-a" aria-hidden="true" />
        <div className="gate-decoration gate-decoration-b" aria-hidden="true" />
        <section className="admin-login-card">
          <a href="/" className="login-brand-link" aria-label="Retour à l’accueil"><BrandMark /></a>
          <div className="admin-login-mark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-4" /></svg></div>
          <p className="admin-eyebrow">ACCÈS RÉSERVÉ AU COMITÉ</p>
          <h1>Espace administration</h1>
          <p className="admin-login-description">Entrez le code numérique du comité pour accéder aux inscriptions et au scanner.</p>
          <form className="admin-login-form" onSubmit={submitLogin}>
            <label className="field-label" htmlFor="admin-pin">Code administrateur</label>
            <input
              id="admin-pin"
              className="text-input pin-input"
              type="password"
              autoComplete="off"
              maxLength={64}
              placeholder="Code du comité"
              value={pin}
              onChange={(event) => setPin(event.target.value.slice(0, 64))}
              required
            />
            {loginError && <p className="form-error" role="alert">{loginError}</p>}
            <button className="primary-button" type="submit" disabled={loggingIn || pin.length < 4}>
              {loggingIn ? <><span className="button-spinner" /> Vérification…</> : <>Se connecter <span aria-hidden="true">→</span></>}
            </button>
          </form>
          <a className="back-home-link" href="/">← Retour à l’inscription</a>
        </section>
      </main>
    );
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <a className="header-brand" href="/" aria-label="WOMEN INCREASE INTERNATIONAL"><BrandMark /></a>
        <div className="admin-header-right">
          <span className="admin-live-label"><i /> SESSION ADMINISTRATEUR</span>
          <button className="logout-button" type="button" onClick={logout}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" /></svg> Déconnexion</button>
        </div>
      </header>

      <main className="admin-main">
        <div className="admin-page-heading">
          <div>
            <p className="admin-eyebrow">WOMEN INCREASE INTERNATIONAL · 2026</p>
            <h1>Tableau de bord</h1>
            <p>Suivi des badges numériques de la conférence annuelle.</p>
          </div>
          <button className="scanner-launch-button" type="button" onClick={() => setScannerOpen(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 8V5a1 1 0 0 1 1-1h3m8 0h3a1 1 0 0 1 1 1v3m0 8v3a1 1 0 0 1-1 1h-3m-8 0H5a1 1 0 0 1-1-1v-3M4 12h16" /><path d="M8 12V9a4 4 0 0 1 8 0v3" /></svg>
            SCANNER UN BADGE
          </button>
        </div>

        <section className="stats-grid" aria-label="Statistiques des inscriptions">
          <article className="stat-card stat-card-total"><span className="stat-icon"><StatIcon type="people" /></span><span className="stat-label">Total des participantes</span><strong>{stats.total.toLocaleString("fr-FR")}</strong><span className="stat-caption">Inscriptions enregistrées</span></article>
          <article className="stat-card"><span className="stat-icon stat-icon-standard"><StatIcon type="standard" /></span><span className="stat-label">Badges STANDARD</span><strong>{stats.standard.toLocaleString("fr-FR")}</strong><span className="stat-caption">2 000 FCFA chacun</span></article>
          <article className="stat-card"><span className="stat-icon stat-icon-vip"><StatIcon type="vip" /></span><span className="stat-label">Badges VIP</span><strong>{stats.vip.toLocaleString("fr-FR")}</strong><span className="stat-caption">5 000 FCFA chacun</span></article>
        </section>

        <section className="registrations-section">
          <div className="list-heading">
            <div><p className="admin-eyebrow">BASE DES INSCRIPTIONS</p><h2>Participantes <span>{filteredRegistrations.length}</span></h2></div>
            <a className="export-button" href="/api/export" download>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v3h16v-3" /></svg>
              Exporter CSV
            </a>
          </div>

          <div className="list-toolbar">
            <label className="search-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></svg>
              <span className="visually-hidden">Rechercher par nom ou téléphone</span>
              <input type="search" placeholder="Rechercher un nom ou un téléphone…" value={search} onChange={(event) => setSearch(event.target.value)} />
            </label>
            <label className="filter-select-wrap"><span className="visually-hidden">Filtrer par type de badge</span>
              <select className="filter-select" value={filterType} onChange={(event) => setFilterType(event.target.value as FilterType)}>
                <option value="all">Tous les badges</option>
                <option value="standard">Standard</option>
                <option value="vip">VIP</option>
              </select>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m7 10 5 5 5-5" /></svg>
            </label>
          </div>

          {filteredRegistrations.length > 0 ? (
            <>
              <div className="table-scroll-wrap">
                <table className="participants-table">
                  <thead><tr><th>N°</th><th>Nom complet</th><th>Téléphone</th><th>Email</th><th>Badge</th><th>Montant</th><th>Code d’inscription</th><th>Enregistrée le</th><th><span className="visually-hidden">Détails</span></th></tr></thead>
                  <tbody>
                    {filteredRegistrations.map((registration, index) => (
                      <tr key={registration.id}>
                        <td className="row-number">{String(index + 1).padStart(2, "0")}</td>
                        <td className="participant-name-cell">{registration.fullName}</td>
                        <td>{registration.phone}</td>
                        <td className="email-cell">{registration.email}</td>
                        <td><BadgePill type={registration.badgeType} /></td>
                        <td className="amount-cell">{formatAmount(registration.amount)}</td>
                        <td><code className="code-cell">{registration.qrCode}</code></td>
                        <td className="date-cell">{formatDate(registration.createdAt)}</td>
                        <td><button className="details-button" type="button" onClick={() => void openDetails(registration)}>Détails <span aria-hidden="true">↗</span></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="participant-card-list">
                {filteredRegistrations.map((registration, index) => (
                  <article className="participant-card" key={registration.id}>
                    <div className="participant-card-top"><span className="participant-card-number">N° {String(index + 1).padStart(2, "0")}</span><BadgePill type={registration.badgeType} /></div>
                    <h3>{registration.fullName}</h3>
                    <p className="participant-card-contact"><span>{registration.phone}</span><span>{registration.email}</span></p>
                    <div className="participant-card-bottom"><code>{registration.qrCode}</code><strong>{formatAmount(registration.amount)}</strong></div>
                    <div className="participant-card-actions"><span>{formatDate(registration.createdAt)}</span><button className="details-button" type="button" onClick={() => void openDetails(registration)}>Voir le badge <span aria-hidden="true">↗</span></button></div>
                  </article>
                ))}
              </div>
            </>
          ) : registrationsList.length === 0 ? (
            <div className="empty-state"><span className="empty-state-icon"><StatIcon type="people" /></span><h3>Aucune participante enregistrée</h3><p>Les inscriptions confirmées apparaîtront ici.</p></div>
          ) : (
            <div className="empty-state empty-search-state"><h3>Aucun résultat</h3><p>Aucune participante ne correspond à cette recherche.</p><button className="text-button" type="button" onClick={() => { setSearch(""); setFilterType("all"); }}>Effacer les filtres</button></div>
          )}
        </section>

        <footer className="admin-footer"><span>WOMEN INCREASE INTERNATIONAL</span><span>Femmes Épanouies, Femme d’Impact · 05 décembre 2026</span></footer>
      </main>

      {scannerOpen && <ScannerModal onClose={() => setScannerOpen(false)} onSessionExpired={() => { setScannerOpen(false); setView("login"); setLoginError("Votre session a expiré. Reconnectez-vous pour continuer."); }} />}

      {selected && (
        <div className="detail-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDetails(); }}>
          <section className="detail-modal" role="dialog" aria-modal="true" aria-labelledby="detail-title">
            <div className="detail-modal-header"><div><p className="admin-eyebrow">DÉTAIL DE L’INSCRIPTION</p><h2 id="detail-title">Badge participante</h2></div><button className="icon-button detail-close" type="button" onClick={closeDetails} aria-label="Fermer">×</button></div>
            <div className="detail-modal-content">
              <div className="detail-information">
                <div className="detail-person-heading"><span className="detail-avatar" aria-hidden="true">{selected.fullName.trim().charAt(0).toLocaleUpperCase("fr-FR")}</span><div><h3>{selected.fullName}</h3><BadgePill type={selected.badgeType} /></div></div>
                <dl className="detail-list">
                  <div><dt>Téléphone</dt><dd>{selected.phone}</dd></div>
                  <div><dt>Adresse email</dt><dd>{selected.email}</dd></div>
                  <div><dt>Type de badge</dt><dd>{selected.badgeType === "vip" ? "VIP" : "Standard"}</dd></div>
                  <div><dt>Montant</dt><dd>{formatAmount(selected.amount)}</dd></div>
                  <div><dt>Code d’inscription</dt><dd><code>{selected.qrCode}</code></dd></div>
                  <div><dt>Date d’enregistrement</dt><dd>{formatDate(selected.createdAt)}</dd></div>
                </dl>
                {detailQrError && <p className="form-error" role="alert">{detailQrError}</p>}
                <button className="primary-button detail-download-button" type="button" disabled={!detailQr || downloading} onClick={() => void downloadSelectedBadge()}>
                  {downloading ? <><span className="button-spinner" /> Préparation du PNG…</> : <>Télécharger le badge PNG <span aria-hidden="true">↓</span></>}
                </button>
              </div>
              <div className="detail-badge-preview">
                {detailQr ? <EventBadge ref={badgeRef} registration={selected} qrDataUrl={detailQr} /> : <div className="detail-badge-loading"><span className="button-spinner" /><span>Préparation du badge…</span></div>}
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
