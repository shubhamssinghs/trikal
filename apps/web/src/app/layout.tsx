import type { Metadata } from "next";
import { TrishulProvider } from "@/lib/auth/trishul-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trikal — Command Center",
  description: "AI Technical Manager Command Center",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-gray-100 antialiased">
        <TrishulProvider>{children}</TrishulProvider>
      </body>
    </html>
  );
}
