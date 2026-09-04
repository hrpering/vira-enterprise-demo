import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "@vira-enterprise-genui/airline-brand-kit/base.css";
import "@vira-enterprise-genui/airline-brand-kit/booking-flow.css";
import "@vira-enterprise-genui/airline-brand-kit/guidance.css";

export const metadata: Metadata = {
  title: "Airline Assistant · Vira GenUI",
  description: "Real LLM chat connected to Vira Enterprise GenUI.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
