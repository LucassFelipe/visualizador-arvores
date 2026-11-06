import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Árvore Binária — Visualizador de BST",
  description:
    "Visualize, edite e percorra árvores binárias de busca com animações passo a passo.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
