import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import { ToastProvider } from "@/components/Toast";
import Preloader from "@/components/Preloader";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "SCSVMV Visitor Management System",
    template: "%s | SCSVMV VMS",
  },
  description: "Official Visitor Management System for Sri Chandrasekharendra Saraswathi Viswa Mahavidyalaya (SCSVMV). Register visitors, manage approvals, and track check-ins.",
  keywords: ["SCSVMV", "visitor management", "university", "check-in", "visitor pass"],
  authors: [{ name: "SCSVMV IT Department" }],
  openGraph: {
    title: "SCSVMV Visitor Management System",
    description: "Official Visitor Management System for SCSVMV University",
    type: "website",
    siteName: "SCSVMV VMS",
  },
  twitter: {
    card: "summary",
    title: "SCSVMV Visitor Management System",
    description: "Official Visitor Management System for SCSVMV University",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#FF9933" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="SCSVMV VMS" />
      </head>
      <body className={`${inter.className}`}>
        <ToastProvider>
          <Preloader duration={2} />
          {/* Skip to content link for keyboard accessibility */}
          <a href="#main-content" className="skip-link">
            Skip to main content
          </a>
          <Header />
          <main id="main-content" role="main" style={{ paddingTop: 'var(--header-height)' }}>
            {children}
          </main>
          <footer className="site-footer">
            <span>&copy; 2026 SCSVMV &mdash; Developed by IT Students</span>
          </footer>
        </ToastProvider>
      </body>
    </html>
  );
}
