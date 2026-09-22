// Service worker de Griyo — solo para notificaciones push de recordatorios.
// No cachea nada de la app (no es un service worker de "modo offline"): su
// único trabajo es quedar vivo en background para poder mostrar una
// notificación del sistema cuando llega un push, aunque el navegador esté
// cerrado o la pestaña no esté al frente.

self.addEventListener("push", (event) => {
  let datos = { titulo: "Griyo", cuerpo: "Tienes un recordatorio.", tag: "griyo-recordatorio" };
  try {
    if (event.data) datos = { ...datos, ...event.data.json() };
  } catch {
    // Si el payload no es JSON válido, se muestra igual con el texto por defecto.
  }

  event.waitUntil(
    self.registration.showNotification(datos.titulo, {
      body: datos.cuerpo,
      tag: datos.tag,
      // Sin icon/badge a propósito: todavía no hay un ícono de marca en
      // /public. Agregar icon-192.png (192x192) y badge-96.png (96x96, para
      // Android) ahí y sumarlos acá apenas existan.
      requireInteraction: true, // no se cierra sola — un recordatorio no se puede pasar por alto
      data: { url: datos.url || "/abuelo" },
    })
  );
});

// Al tocar la notificación, lleva a la app (o la trae al frente si ya está abierta).
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/abuelo";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
