"use client";

import { useEffect } from "react";

/** Opens the print dialog once the page has rendered (print pages opened from the order card) */
export function AutoPrint() {
  useEffect(() => {
    const id = window.setTimeout(() => window.print(), 400);
    return () => window.clearTimeout(id);
  }, []);
  return null;
}
