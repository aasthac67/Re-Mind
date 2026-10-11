import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Re:Mind — Less remembering. More doing.",
  description: "A source-backed continuity layer for your conversations and tasks.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
