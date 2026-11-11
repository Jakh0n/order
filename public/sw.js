// Admin service worker (scope /admin/): shows new-order push notifications.
// No caching / offline here on purpose — the admin always needs live data.

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: event.data.text() };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "New order", {
      body: data.body || "",
      tag: data.tag,
      renotify: Boolean(data.tag),
      icon: "/pwa-icon/192",
      badge: "/pwa-icon/96",
      vibrate: [200, 100, 200],
      requireInteraction: true,
      data: { url: data.url || "/admin/orders" },
    }),
  );
});

// Tap → focus an open admin tab (and go to orders), or open one
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/admin/orders", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((tabs) => {
      for (const tab of tabs) {
        if (tab.url.includes("/admin")) {
          return tab.focus().then((t) => (t && "navigate" in t ? t.navigate(url) : t));
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
