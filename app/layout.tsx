import type React from "react"
import type { Metadata } from "next"
import { Inter, Mona_Sans } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

const monaSans = Mona_Sans({
  subsets: ["latin"],
  variable: "--font-mona-sans",
  display: "swap",
})

export const metadata: Metadata = {
  title: "DashMovie - Sua Central de Filmes",
  description: "Descubra, organize e acompanhe seus filmes favoritos",
  icons: {
    icon: "/cinema.ico",
  },
    generator: 'v0.app'
}

export const viewport = {
  themeColor: "#0f0f17",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Adicione o suppressHydrationWarning aqui:
    <html lang="pt-BR" className={`dark ${inter.variable} ${monaSans.variable}`} suppressHydrationWarning>
      <body className={`font-sans antialiased min-h-screen bg-background`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
