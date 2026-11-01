import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { getSettings } from "@/lib/settings";
import { CartProvider } from "@/components/cart-provider";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    title: {
      default: `${s.store_name} — Premium Men's Fashion in Nigeria`,
      template: `%s | ${s.store_name}`,
    },
    description: s.store_tagline,
    openGraph: {
      siteName: s.store_name,
      type: "website",
      images: ["/images/hero.jpg"],
    },
  };
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-white text-black antialiased">
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
