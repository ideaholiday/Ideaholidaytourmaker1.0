
// Give the service worker access to Firebase Messaging.
// Note that you can only use Firebase Messaging here. Other Firebase libraries are not available in the service worker.
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in the messagingSenderId.
firebase.initializeApp({
  apiKey: "AIzaSyBGCvWFm7hoWVPWWx-j5XtVV8mSYYa1chE",
  authDomain: "ideaholidaytourmaker.firebaseapp.com",
  projectId: "ideaholidaytourmaker",
  storageBucket: "ideaholidaytourmaker.firebasestorage.app",
  messagingSenderId: "468639922528",
  appId: "1:468639922528:web:e1d86abd4ff170f1338605",
});

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  // Customize notification here
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: 'https://file-service-alpha.vercel.app/file/a8d8e3c0-362c-473d-82d2-282e366184e9/607e4d82-c86e-4171-aa3b-8575027588b3.png',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
