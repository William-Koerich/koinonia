// Service worker do Koinonia: recebe as notificações push e abre a tela certa ao tocar.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let dados;
  try {
    dados = event.data.json();
  } catch {
    dados = { titulo: "Igreja Koinonia", mensagem: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(dados.titulo || "Igreja Koinonia", {
      body: dados.mensagem || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-96.png",
      tag: dados.tag,
      data: { url: dados.url || "/app" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destino = new URL(event.notification.data?.url || "/app", self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((janelas) => {
      // reaproveita uma janela do app já aberta
      for (const janela of janelas) {
        if (new URL(janela.url).origin === self.location.origin && "focus" in janela) {
          return janela.focus().then(() => janela.navigate(destino));
        }
      }
      return self.clients.openWindow(destino);
    }),
  );
});
