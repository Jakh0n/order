"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

import en from "@/messages/en.json";

// Root layout ham yiqilganda ishlaydi — NextIntlClientProvider yo'q, shuning uchun matn to'g'ridan-to'g'ri.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  const t = en.errorPage;

  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          margin: 0,
          padding: 16,
          textAlign: "center",
        }}
      >
        <main>
          <h1 style={{ fontSize: 20 }}>{t.title}</h1>
          <p style={{ color: "#666" }}>{t.description}</p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 12,
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid #ccc",
            }}
          >
            {t.retry}
          </button>
        </main>
      </body>
    </html>
  );
}
