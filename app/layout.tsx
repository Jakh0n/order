import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { Suspense } from "react";

import { HtmlLang } from "@/components/html-lang";
import { Toaster } from "@/components/ui/sonner";

import "./globals.css";

const fontSans = Inter({
  variable: "--font-sans",
  subsets: ["latin", "cyrillic"],
});

const fontMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: {
    default: "order",
    template: "%s · order",
  },
  description: "Kafe va oshxonalar uchun onlayn buyurtma",
};

// Til cookie'dan o'qiladi (runtime API) — cacheComponents rejimida Suspense ichida bo'lishi shart.
async function IntlProvider({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <NextIntlClientProvider locale={locale}>
      <HtmlLang locale={locale} />
      {children}
    </NextIntlClientProvider>
  );
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="uz" className={`${fontSans.variable} ${fontMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <Suspense>
          <IntlProvider>{children}</IntlProvider>
        </Suspense>
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
