"use client";

import { BellRing, Loader2, Smartphone } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { deletePushSubscription, savePushSubscription } from "@/lib/push/actions";
import { cn } from "@/lib/utils";

type State =
  | "loading"
  | "unsupported" // no service worker / push in this browser
  | "install" // iPhone/iPad Safari: push only works from the home-screen app
  | "denied" // permission blocked in browser settings
  | "off"
  | "on";

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

/** base64url VAPID key → bytes for pushManager.subscribe */
function keyBytes(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function isIos() {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && (navigator as { standalone?: boolean }).standalone === true)
  );
}

/** Short device label for the subscription row ("iPhone · Safari") */
function deviceLabel() {
  const ua = navigator.userAgent;
  const device = /iPhone|iPad/.test(ua)
    ? "iPhone"
    : /Android/.test(ua)
      ? "Android"
      : /Mac/.test(ua)
        ? "Mac"
        : /Windows/.test(ua)
          ? "Windows"
          : "Device";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Chrome\//.test(ua)
      ? "Chrome"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Safari\//.test(ua)
          ? "Safari"
          : "Browser";
  return `${device} · ${browser}`;
}

/**
 * "Notify me about new orders on this device".
 * Registers the admin service worker, asks permission, saves the push subscription.
 */
export function PushToggle() {
  const t = useTranslations("push");
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [help, setHelp] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supported = "serviceWorker" in navigator && "PushManager" in window && !!VAPID;
      if (!supported) {
        // iPhone Safari outside the home-screen app has no PushManager at all
        if (!cancelled) setState(isIos() && !isStandalone() ? "install" : "unsupported");
        return;
      }
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/admin/" });
        const sub = await reg.pushManager.getSubscription();
        if (cancelled) return;
        if (Notification.permission === "denied") setState("denied");
        else setState(sub ? "on" : "off");
        // Keep the server row fresh (e.g. after a re-login on the same device)
        if (sub) void savePushSubscription(sub.toJSON(), deviceLabel());
      } catch {
        if (!cancelled) setState("unsupported");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function turnOn() {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: keyBytes(VAPID),
        }));
      const saved = await savePushSubscription(sub.toJSON(), deviceLabel());
      if (!saved.ok) throw new Error(saved.error);
      setState("on");
      toast.success(t("enabled"));
    } catch {
      toast.error(t("failed"));
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await deletePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
      toast.success(t("disabled"));
    } catch {
      toast.error(t("failed"));
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading" || state === "unsupported") return null;

  const label = state === "on" ? t("on") : state === "install" ? t("installShort") : t("turnOn");

  return (
    <>
      <Button
        id="push"
        variant={state === "on" ? "ghost" : "outline"}
        size="sm"
        disabled={busy}
        onClick={() => {
          if (state === "on") void turnOff();
          else if (state === "off") void turnOn();
          else setHelp(true);
        }}
        title={state === "on" ? t("turnOffHint") : undefined}
        className={cn("gap-1.5", state === "on" && "text-primary")}
      >
        {busy ? (
          <Loader2 className="size-4 animate-spin" />
        ) : state === "install" ? (
          <Smartphone className="size-4" />
        ) : (
          <BellRing className="size-4" />
        )}
        <span className="hidden sm:inline">{label}</span>
      </Button>

      <Dialog open={help} onOpenChange={setHelp}>
        <DialogContent>
          <DialogTitle>{state === "install" ? t("installTitle") : t("deniedTitle")}</DialogTitle>
          <DialogDescription className="whitespace-pre-line">
            {state === "install" ? t("installSteps") : t("deniedSteps")}
          </DialogDescription>
        </DialogContent>
      </Dialog>
    </>
  );
}
