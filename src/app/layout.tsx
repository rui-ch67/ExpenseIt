import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import { PageViews } from "@/ui/analytics";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  axes: ["opsz", "wdth"],
  variable: "--font-bricolage",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "ExpenseIt", template: "%s · ExpenseIt" },
  description: "Snap a receipt, see where your money goes.",
  applicationName: "ExpenseIt",
  // Lets iPhones open the home-screen copy full screen, like an app.
  appleWebApp: { capable: true, title: "ExpenseIt", statusBarStyle: "default" },
  openGraph: { siteName: "ExpenseIt", type: "website", locale: "en_GB" },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-GB" className={bricolage.variable}>
      <body className="min-h-dvh">
        {children}
        <PageViews />
      </body>
    </html>
  );
}
