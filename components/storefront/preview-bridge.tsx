"use client";

import { useEffect } from "react";

import { themeCss } from "@/lib/design";

export const PREVIEW_MESSAGE = "flami-design-preview";

/**
 * Live colors in the admin Design page preview (the store page runs in an iframe there).
 * Only reacts inside an iframe, only to messages from this same site, and only to colors —
 * themeCss() accepts validated hex values and fixed keywords, never free text.
 */
export function PreviewBridge() {
  useEffect(() => {
    if (window.parent === window) return;
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: string; brandColor?: unknown; pageBackground?: unknown };
      if (data?.type !== PREVIEW_MESSAGE) return;
      let style = document.getElementById("flami-preview-theme");
      if (!style) {
        style = document.createElement("style");
        style.id = "flami-preview-theme";
        // End of body: later than the saved theme <style>, so the preview wins the cascade
        document.body.appendChild(style);
      }
      style.textContent = themeCss({
        brandColor: typeof data.brandColor === "string" ? data.brandColor : null,
        pageBackground: typeof data.pageBackground === "string" ? data.pageBackground : "gray",
      });
    }
    window.addEventListener("message", onMessage);
    // Tell the Design page we're ready to receive the current (unsaved) colors
    window.parent.postMessage({ type: `${PREVIEW_MESSAGE}:ready` }, window.location.origin);
    return () => window.removeEventListener("message", onMessage);
  }, []);
  return null;
}
