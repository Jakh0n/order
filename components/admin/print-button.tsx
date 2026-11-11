"use client";

import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";

export function PrintButton({ label }: { label: string }) {
  return (
    <Button onClick={() => window.print()} className="gap-2">
      <Printer className="size-4" aria-hidden />
      {label}
    </Button>
  );
}
