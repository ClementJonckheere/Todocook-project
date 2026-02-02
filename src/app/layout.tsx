import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "TodoCook - Votre assistant cuisine",
  description: "Gérez vos recettes, votre garde-manger et votre nutrition",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-gray-50 pb-20">
        <main className="max-w-lg mx-auto">{children}</main>
        <Navbar />
      </body>
    </html>
  );
}
