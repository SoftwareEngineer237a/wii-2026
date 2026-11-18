"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Html5Qrcode } from "html5-qrcode";
import type { RegistrationView } from "@/lib/types";

type ScannerModalProps = {
  onClose: () => void;
  onSessionExpired: () => void;
};

type VerificationResult = {
  valid: boolean;
  registration?: RegistrationView;
  message?: string;
};

function formatAmount(amount: number) {
  return `${amount.toLocaleString("fr-FR")} FCFA`;
}

export default function ScannerModal({ onClose, onSessionExpired }: ScannerModalProps) {
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [cameraError, setCameraError] = useState("");
  const [cameraReady, setCameraReady] = useState(false);
  const [checking, setChecking] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [manualError, setManualError] = useState("");
  const [restartKey, setRestartKey] = useState(0);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const busyRef = useRef(false);

  async function verifyCode(rawCode: string) {
    if (busyRef.current) return;
    const code = rawCode.trim().toUpperCase();
    if (!code) {
      setManualError("Saisissez le code imprimé sous le QR code.");
      return;
    }

    busyRef.current = true;
    setChecking(true);
    setManualError("");
    let hasResult = false;

    try {
      const scanner = scannerRef.current;
      if (scanner?.isScanning) {
        try {
          await scanner.stop();
        } catch {
          // La vérification continue même si le navigateur a déjà arrêté la caméra.
        }
      }

      const response = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        valid?: boolean;
        registration?: RegistrationView;
        error?: string;
      };

      if (response.status === 401) {
        hasResult = true;
        onSessionExpired();
        return;
      }
      if (response.status >= 500) {
        throw new Error(payload.error || "La vérification est indisponible. Vérifiez le réseau.");
      }

      hasResult = true;
      if (response.ok && payload.valid && payload.registration) {
        setResult({ valid: true, registration: payload.registration });
      } else {
        setResult({
          valid: false,
          message: payload.error || "Badge non reconnu — Aucune inscription correspondante.",
        });
      }
    } catch (caught) {
      setManualError(caught instanceof Error ? caught.message : "Impossible de joindre le serveur. Vérifiez le réseau.");
    } finally {
      setChecking(false);
      if (!hasResult) {
        busyRef.current = false;
        setRestartKey((value) => value + 1);
      }
    }
  }

  useEffect(() => {
    if (result) return;
    let active = true;
    let localScanner: Html5Qrcode | null = null;
    setCameraReady(false);
    setCameraError("");

    void import("html5-qrcode")
      .then(async ({ Html5Qrcode }) => {
        if (!active) return;
        const cameraElement = document.getElementById("wii-camera-reader");
        if (!cameraElement) return;

        localScanner = new Html5Qrcode("wii-camera-reader", { verbose: false });
        scannerRef.current = localScanner;
        try {
          await localScanner.start(
            { facingMode: "environment" },
            {
              fps: 12,
              qrbox: (viewfinderWidth, viewfinderHeight) => {
                const size = Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.78);
                return { width: size, height: size };
              },
              aspectRatio: 1,
              disableFlip: false,
            },
            (decodedText) => {
              if (!busyRef.current) void verifyCode(decodedText);
            },
            () => undefined,
          );
          if (!active || busyRef.current) {
            if (localScanner.isScanning) await localScanner.stop();
            return;
          }
          setCameraReady(true);
        } catch {
          if (active) {
            setCameraError(
              "Impossible d’ouvrir la caméra. Autorisez son accès dans le navigateur et utilisez une connexion HTTPS. Vous pouvez saisir le code manuellement ci-dessous.",
            );
          }
        }
      })
      .catch(() => {
        if (active) setCameraError("Le scanner n’a pas pu être chargé. Saisissez le code du badge manuellement.");
      });

    return () => {
      active = false;
      if (localScanner) {
        if (localScanner.isScanning) {
          void localScanner.stop().then(() => {
            try {
              localScanner?.clear();
            } catch {
              // L’élément vidéo peut déjà avoir été retiré par le navigateur.
            }
          }).catch(() => undefined);
        } else {
          try {
            localScanner.clear();
          } catch {
            // Le lecteur a déjà été nettoyé.
          }
        }
      }
      if (scannerRef.current === localScanner) scannerRef.current = null;
    };
    // The scanner lifecycle restarts only after a result or a failed request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, restartKey]);

  function submitManualCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void verifyCode(manualCode);
  }

  function scanNext() {
    busyRef.current = false;
    setResult(null);
    setManualCode("");
    setManualError("");
    setCameraError("");
    setRestartKey((value) => value + 1);
  }

  return (
    <div className="scanner-overlay" role="dialog" aria-modal="true" aria-labelledby="scanner-title">
      <header className="scanner-header">
        <div>
          <p className="admin-eyebrow">CONTRÔLE À L’ENTRÉE</p>
          <h2 id="scanner-title">Scanner un badge</h2>
        </div>
        <button className="icon-button scanner-close" type="button" onClick={onClose} aria-label="Fermer le scanner">×</button>
      </header>

      <div className="scanner-content">
        {!result ? (
          <>
            <p className="scanner-instruction">Placez le QR code au centre du cadre. La vérification se fait en direct dans la base des inscriptions.</p>
            <div className={`camera-panel${cameraError ? " camera-panel-error" : ""}`}>
              <div id="wii-camera-reader" className="camera-reader" />
              {!cameraReady && !cameraError && (
                <div className="camera-status"><span className="button-spinner" /> Préparation de la caméra…</div>
              )}
              {cameraError && <p className="camera-error-message" role="status">{cameraError}</p>}
              {checking && <div className="camera-checking"><span className="button-spinner" /> Vérification du badge…</div>}
            </div>
            <div className="manual-code-block">
              <div className="manual-code-heading"><span>Pas de caméra ?</span><span className="manual-divider" /></div>
              <form className="manual-code-form" onSubmit={submitManualCode}>
                <label className="visually-hidden" htmlFor="manual-code">Code d’inscription</label>
                <input
                  id="manual-code"
                  className="text-input manual-code-input"
                  type="text"
                  placeholder="WII-XXXXXXXX"
                  autoCapitalize="characters"
                  autoComplete="off"
                  maxLength={12}
                  value={manualCode}
                  onChange={(event) => setManualCode(event.target.value.toUpperCase())}
                />
                <button className="primary-button manual-submit" type="submit" disabled={checking || !manualCode.trim()}>
                  Vérifier
                </button>
              </form>
              {manualError && <p className="form-error scanner-error" role="alert">{manualError}</p>}
            </div>
          </>
        ) : (
          <div className={`verification-result${result.valid ? " verification-valid" : " verification-invalid"}`}>
            <div className="verification-result-icon" aria-hidden="true">{result.valid ? "✓" : "×"}</div>
            <p className="verification-kicker">RÉSULTAT DU CONTRÔLE</p>
            <h3>{result.valid ? "BADGE VALIDE" : "BADGE NON RECONNU"}</h3>
            {result.valid && result.registration ? (
              <div className="valid-attendee-card">
                <p className="valid-attendee-name">{result.registration.fullName}</p>
                <div className="valid-attendee-meta">
                  <span className={`badge-pill${result.registration.badgeType === "vip" ? " badge-pill-vip" : ""}`}>
                    {result.registration.badgeType === "vip" ? "VIP" : "STANDARD"}
                  </span>
                  <strong>{formatAmount(result.registration.amount)}</strong>
                </div>
                <p className="valid-attendee-code">{result.registration.qrCode}</p>
              </div>
            ) : (
              <p className="invalid-result-copy">{result.message || "Aucune inscription correspondante."}</p>
            )}
            <button className="primary-button scan-next-button" type="button" onClick={scanNext}>Scanner le suivant <span aria-hidden="true">→</span></button>
          </div>
        )}
      </div>
    </div>
  );
}
