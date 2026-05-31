import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trikal",
  description: "Monorepo with Next.js and FastAPI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background antialiased">
        {children}
      </body>
    </html>
  );
}