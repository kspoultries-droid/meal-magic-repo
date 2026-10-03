import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.p1324956aa36e44cebf0eabe4ab646da4',
  appName: 'Easy Life',
  webDir: 'dist',
  server: {
    // Native app loads the live published site so every web update reaches the APK instantly.
    url: 'https://easylife.apnahub.online',
    cleartext: false,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
