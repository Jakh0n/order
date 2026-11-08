"use client";

import { useEffect } from "react";

/** <html lang> ni cookie'dagi tilga moslaydi (root layout statik "uz" bilan render qilinadi). */
export function HtmlLang({ locale }: { locale: string }) {
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return null;
}
