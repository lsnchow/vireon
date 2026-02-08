import type { Metadata } from "next";
import "./globals.css";
import VisualEditsMessenger from "../visual-edits/VisualEditsMessenger";
import ErrorReporter from "@/components/ErrorReporter";
import Script from "next/script";
import { Geist_Mono } from "next/font/google";

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "Vireon — Urban Transparency Simulator",
  description: "Blueprint your sustainable city. Vireon is an urban transparency building simulator for sustainability-focused urban planning.",
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
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;500;600;700&family=Architects+Daughter&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,700&display=swap" rel="stylesheet" />
        <script dangerouslySetInnerHTML={{__html: `
          // Disable Next.js error overlay
          if (typeof window !== 'undefined') {
            window.addEventListener('error', function(e) {
              if (e.message && (e.message.includes('Hydration') || e.message.includes('Minified React'))) {
                e.stopImmediatePropagation();
              }
            });
            window.addEventListener('unhandledrejection', function(e) {
              if (e.reason && e.reason.message && e.reason.message.includes('Hydration')) {
                e.stopImmediatePropagation();
              }
            });
            // Hide Next.js error overlay iframe
            const hideOverlay = () => {
              const overlay = document.querySelector('nextjs-portal');
              if (overlay) overlay.style.display = 'none';
            };
            setInterval(hideOverlay, 100);
          }
        `}} />
      </head>
      <body className={`antialiased ${geistMono.variable}`}>
        <Script
          id="orchids-browser-logs"
          src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/scripts/orchids-browser-logs.js"
          strategy="lazyOnload"
          data-orchids-project-id="e8d2c71f-d93c-494a-abed-b6d853a8c54a"
        />
        <ErrorReporter />
        <Script
          src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/scripts//route-messenger.js"
          strategy="lazyOnload"
          data-target-origin="*"
          data-message-type="ROUTE_CHANGE"
          data-include-search-params="true"
          data-only-in-iframe="true"
          data-debug="true"
          data-custom-data='{"appName": "YourApp", "version": "1.0.0", "greeting": "hi"}'
        />
        {children}
        <VisualEditsMessenger />
      </body>
    </html>
  );
}
