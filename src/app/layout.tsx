import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tralytic",
  description:
    "Behavioural trading analytics — track RRx, sessions and execution patterns, not just P&L",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
