import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toast";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bybit Futures Calculator",
  description: "Trading risk management tool",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        {/* Инъекция скрипта: мгновенно вешает дата-атрибуты на html до рендера body */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const saved = localStorage.getItem('bybit_calculator_layout_v1');
                if (saved) {
                  const parsed = JSON.parse(saved);
                  if (parsed.isCalcExpanded === false) document.documentElement.setAttribute('data-hide-calc', 'true');
                  if (parsed.isChartExpanded === false) document.documentElement.setAttribute('data-hide-chart', 'true');
                  if (parsed.isJournalExpanded === false) document.documentElement.setAttribute('data-hide-journal', 'true');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.className} ${geistMono.variable} font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
