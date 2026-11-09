"use client";

import { Bell, BellOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

const SEEN_KEY = "admin-seen-new";
const SOUND_KEY = "admin-sound";

function readSound(): boolean {
  try {
    return localStorage.getItem(SOUND_KEY) !== "off";
  } catch {
    return true;
  }
}

function subscribeSound(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener("admin-sound", onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener("admin-sound", onChange);
  };
}

let audio: AudioContext | null = null;

/** Short two-tone chime — no audio file needed. Browsers allow it after the first click on the page. */
function chime() {
  try {
    audio ??= new AudioContext();
    void audio.resume();
    const start = audio.currentTime;
    [880, 1320].forEach((freq, i) => {
      const osc = audio!.createOscillator();
      const gain = audio!.createGain();
      osc.frequency.value = freq;
      const t0 = start + i * 0.18;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.3, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.35);
      osc.connect(gain).connect(audio!.destination);
      osc.start(t0);
      osc.stop(t0 + 0.4);
    });
  } catch {
    // No Web Audio — the title badge and toast still work
  }
}

/**
 * New orders on the orders page (it auto-refreshes): a chime + toast for orders not seen before,
 * and "(2) …" in the browser tab title while there are NEW orders.
 */
export function NewOrderAlert({ newIds }: { newIds: string[] }) {
  const t = useTranslations("adminOrders");
  const sound = useSyncExternalStore(subscribeSound, readSound, () => true);
  const baseTitle = useRef<string | null>(null);

  // Unlock audio on the first interaction (autoplay policy)
  useEffect(() => {
    const unlock = () => {
      try {
        audio ??= new AudioContext();
        void audio.resume();
      } catch {
        // ignore
      }
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  useEffect(() => {
    let seen: string[] | null = null;
    try {
      const raw = sessionStorage.getItem(SEEN_KEY);
      seen = raw ? (JSON.parse(raw) as string[]) : null;
      sessionStorage.setItem(SEEN_KEY, JSON.stringify([...new Set([...(seen ?? []), ...newIds])]));
    } catch {
      return;
    }
    // First visit in this tab: everything already on screen counts as seen
    if (!seen) return;
    const fresh = newIds.filter((id) => !seen.includes(id));
    if (fresh.length === 0) return;
    if (readSound()) chime();
    toast.info(t("newOrderToast", { count: fresh.length }));
  }, [newIds, t]);

  useEffect(() => {
    baseTitle.current ??= document.title.replace(/^\(\d+\)\s*/, "");
    document.title =
      newIds.length > 0 ? `(${newIds.length}) ${baseTitle.current}` : baseTitle.current;
  }, [newIds]);

  useEffect(
    () => () => {
      if (baseTitle.current) document.title = baseTitle.current;
    },
    [],
  );

  function toggle() {
    try {
      localStorage.setItem(SOUND_KEY, sound ? "off" : "on");
    } catch {
      // ignore
    }
    window.dispatchEvent(new Event("admin-sound"));
    if (!sound) chime(); // a preview, and unlocks audio
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="text-muted-foreground"
      onClick={toggle}
      aria-pressed={sound}
    >
      {sound ? <Bell /> : <BellOff />}
      {sound ? t("soundOn") : t("soundOff")}
    </Button>
  );
}
