import type { Metadata } from "next";

import "./globals.css";
import "./site.css";



export const metadata: Metadata = {

  title: "ASN | Projetos e avaliações",

  description: "Acompanhamento semanal e avaliação interdisciplinar.",

  other: {

    "codex-preview": "development",

  },

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

    <html lang="pt-BR">

      <body className="antialiased">{children}</body>

    </html>

  );

}

