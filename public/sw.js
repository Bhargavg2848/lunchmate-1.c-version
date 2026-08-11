self.addEventListener('push', function (event) {
  const data = event.data ? event.data.json() : { title: 'Lunchmate Alert', body: 'New order received!' };
  const options = {
    body: data.body,
    icon: '/logo.jpeg',
    badge: '/logo.jpeg'
  };
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});
