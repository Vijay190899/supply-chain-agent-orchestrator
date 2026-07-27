import type { Metadata } from "next";
import { Instrument_Serif, Onest, Geist_Mono } from "next/font/google";
import "./globals.css";

// Editorial serif display over a clean neutral sans, with a mono for telemetry.
const serif = Instrument_Serif({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

const onest = Onest({
  variable: "--font-sans",
  subsets: ["latin"],
});

const mono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Disruption Console · Autonomous logistics, watched by a human",
  description:
    "An immersive console for a multi-agent logistics orchestrator: four agents reroute a blocked shipping lane and hold for a human when the fix runs expensive.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${serif.variable} ${onest.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
