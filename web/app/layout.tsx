import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Two voices: a grotesque for the humans, monospace for the machine.
const grotesk = Space_Grotesk({
  variable: "--font-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jbmono = JetBrains_Mono({
  variable: "--font-jbmono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Disruption Console · Multi-agent logistics orchestrator",
  description:
    "Watch a LangGraph multi-agent system detect a supply-chain disruption, price options, pause for human approval, and draft the customer notice, live.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${grotesk.variable} ${jbmono.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
