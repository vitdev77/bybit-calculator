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
  icons: {
    icon: "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2032%2032%22%3E%3Crect%20width%3D%2232%22%20height%3D%2232%22%20rx%3D%228%22%20fill%3D%22%23131722%22%2F%3E%3Cg%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%3E%3Cline%20x1%3D%2211%22%20y1%3D%224%22%20x2%3D%2211%22%20y2%3D%2228%22%20stroke%3D%22%2300f3a2%22%2F%3E%3Crect%20x%3D%227%22%20y%3D%228%22%20width%3D%228%22%20height%3D%2212%22%20rx%3D%221%22%20fill%3D%22%2300f3a2%22%2F%3E%3Cline%20x1%3D%2221%22%20y1%3D%226%22%20x2%3D%2221%22%20y2%3D%2226%22%20stroke%3D%22%23ff4a6b%22%2F%3E%3Crect%20x%3D%2217%22%20y%3D%2212%22%20width%3D%228%22%20height%3D%2211%22%20rx%3D%221%22%20fill%3D%22%23ff4a6b%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E",
  },
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
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
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
