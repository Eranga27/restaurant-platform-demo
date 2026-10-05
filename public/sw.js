// Service worker for the branch dashboard: shows new-order push alerts.
// Registered with scope /dashboard only.

self.addEventListener("push", (event) => {
  let message = { title: "New order", body: "", url: "/dashboard", tag: "order" };
  try {
    message = { ...message, ...event.data.json() };
  } catch {
    // Not JSON: keep the generic alert.
  }
  event.waitUntil(
    self.registration.showNotification(message.title, {
      body: message.body,
      tag: message.tag,
      renotify: true,
      requireInteraction: true,
      icon: "/icon.svg",
      badge: "/icon.svg",
      data: { url: message.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url ?? "/dashboard", self.location.origin);
  // Only ever open our own dashboard.
  const target =
    url.origin === self.location.origin && url.pathname.startsWith("/dashboard")
      ? url.href
      : new URL("/dashboard", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const open = windows.find((w) =>
        w.url.startsWith(new URL("/dashboard", self.location.origin).href),
      );
      return open ? open.focus() : self.clients.openWindow(target);
    }),
  );
});
