import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Around the A — AI Literacy Game",
  description: "Explore Atlanta and build the skills to use AI well.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
