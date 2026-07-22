import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tinta Privada",
  description: "Escritor local y privado de relatos eróticos y roleplay adulto con LM Studio.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
