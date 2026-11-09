"use client";

import { Check, Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Copies text to the clipboard and shows "Copied" for a moment */
export function CopyButton({ text, className }: { text: string; className?: string }) {
  const t = useTranslations("common");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(id);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      // Clipboard blocked (insecure context / permissions) — the text is still selectable
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={copy}
      className={cn("bg-background", className)}
      aria-live="polite"
    >
      {copied ? <Check className="text-primary" /> : <Copy />}
      {copied ? t("copied") : t("copy")}
    </Button>
  );
}
