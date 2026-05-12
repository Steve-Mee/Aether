import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "AETHER • Command Center", description: "The living, self-evolving AI commerce organism." };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="nl"><body className="bg-[#050505] text-[#F5F5F5] antialiased">{children}</body></html>; }