import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agenly — Advanced AI Agents Framework",
  description: "Deploy and manage custom AI agents tailored for your enterprise with Agenly's scalable multi-tenant platform. Boost customer service and internal operations seamlessly.",
  keywords: ["AI agents", "customer service automation", "enterprise AI", "Agenly", "Generative AI platform", "AI chatbot"],
  openGraph: {
    title: "Agenly — Intelligent AI Agents & Enterprise Solutions",
    description: "Create, manage, and deploy intelligent AI agents for client businesses with isolated knowledge bases and advanced embeddings.",
    url: "https://agenly.app",
    siteName: "Agenly",
    images: [{ url: "/logo.webp", width: 800, height: 600, alt: "Agenly Logo" }],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Agenly",
    description: "Deploy and manage custom AI agents tailored for your enterprise.",
    images: ["/logo.webp"],
  },
  icons: {
    icon: "/logo.webp",
    shortcut: "/logo.webp",
    apple: "/logo.webp",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
