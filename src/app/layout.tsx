import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Femmes Épanouies, Femme d’Impact — WOMEN INCREASE INTERNATIONAL",
  description: "Inscription et badge numérique pour la conférence annuelle WOMEN INCREASE INTERNATIONAL, le 05 décembre 2026 à Yaoundé.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
